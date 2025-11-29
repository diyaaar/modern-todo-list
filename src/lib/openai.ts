import { getCurrentDateTime, parseRelativeDate, parseTime, combineDateTime } from '../utils/dateUtils'
import { parseISO } from 'date-fns'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key is not configured')
}

export interface AISuggestion {
  suggestion: string
  priority?: 'high' | 'medium' | 'low'
}

/**
 * Generate subtask suggestions for a given task using OpenAI
 * Combines user input with AI's intelligent suggestions
 */
export async function generateSubtaskSuggestions(
  taskTitle: string,
  taskDescription?: string | null,
  userInput?: string | null
): Promise<string[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  const hasUserInput = userInput && userInput.trim().length > 0
  const userInputSection = hasUserInput 
    ? `\n\nUser's subtask ideas: "${userInput.trim()}"\n\nCRITICAL RULE: NEVER dismiss user's subtasks as "unrelated" or "random". ALWAYS find the logical connection to the main task and transform each subtask to show that connection clearly.`
    : '\n\nGenerate 5-7 practical, actionable subtasks based on the main task.'

  const prompt = `Given this task: "${taskTitle}"${taskDescription ? `\nDescription: ${taskDescription}` : ''}${userInputSection}

Rules for generating subtasks:
1. ${hasUserInput ? 'ALWAYS include ALL items mentioned by the user. For each user subtask:' : 'Generate 5-7 smart subtasks'}
   ${hasUserInput ? '   a. Ask: "Why would user mention this for THIS main task?"' : ''}
   ${hasUserInput ? '   b. Find the logical connection (think creatively and contextually)' : ''}
   ${hasUserInput ? '   c. Transform the subtask title to make the connection clear' : ''}
   ${hasUserInput ? '   d. User knows what they need - your job is to UNDERSTAND and ENHANCE, not filter out' : ''}
   ${hasUserInput ? '   Example: Main task "Instagram postu oluştur", user says "kahve iç" → Transform to "Kahve temalı içerik hazırla" or "Kahve içerik fikri geliştir"' : ''}
   ${hasUserInput ? '   Example: Main task "Blog yazısı yaz", user says "kahve yap" → Transform to "Kahve hazırla (yazma ortamı)" or "Yazma ortamı hazırla"' : ''}
2. ${hasUserInput ? 'Add 2-4 more intelligent subtasks that complement the user\'s ideas' : 'Make each subtask specific and actionable'}
3. Clean up titles: fix grammar, typos, make them clear and concise
4. Order them logically (what comes first, second, etc.)
5. Keep titles short and action-oriented (2-5 words ideal)
6. ${hasUserInput ? 'Don\'t duplicate - if user said something and you would suggest the same, don\'t repeat it' : 'Make them relevant to the main task'}
7. Handle Turkish and mixed-language input appropriately
8. ${hasUserInput ? 'Think contextually: If user mentions something that seems unrelated, find the creative connection (content theme, preparation step, inspiration source, etc.)' : ''}

Each subtask should be:
- Specific and actionable
- Clear and concise
- Relevant to the main task (or transformed to show relevance)

Return ONLY a JSON array of strings, no explanation or additional text.

Example format: ["Subtask 1", "Subtask 2", "Subtask 3", "Subtask 4", "Subtask 5"]`

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful task management assistant. When users provide subtask ideas, NEVER dismiss them as unrelated. Always find the logical connection to the main task and transform user subtasks to show that connection clearly. Think contextually and creatively. Always return valid JSON arrays.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON from response (handle cases where response might have markdown code blocks)
    let suggestions: string[]
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        suggestions = JSON.parse(content)
      }
    } catch (parseError) {
      // Fallback: try to extract suggestions from text
      const lines = content
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && line.match(/^[-•\d]/))
        .map((line: string) => line.replace(/^[-•\d.\s]+/, '').trim())
        .filter((line: string) => line.length > 0)

      if (lines.length === 0) {
        throw new Error('Could not parse suggestions from response')
      }
      suggestions = lines
    }

    // Validate and clean suggestions
    if (!Array.isArray(suggestions)) {
      throw new Error('Invalid response format: expected array')
    }

    return suggestions
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0)
      .slice(0, 7) // Limit to 7 suggestions
  } catch (error) {
    console.error('Error generating AI suggestions:', error)
    throw error
  }
}

/**
 * Analyze a photo/image and extract tasks using OpenAI Vision API
 */
export interface DetectedTask {
  title: string
  description?: string
  location?: string
  time?: string
  due_date?: string
  type: 'main' | 'subtask'
  subtasks?: DetectedSubtask[]
  suggested_tags?: string[]
  priority?: 'high' | 'medium' | 'low'
}

export interface DetectedSubtask {
  title: string
  notes?: string
}

export interface PhotoAnalysisResult {
  tasks: DetectedTask[]
}

/**
 * Analyze photo and extract tasks using GPT-4 Vision
 */
export async function analyzePhotoForTasks(
  imageBase64: string,
  imageMimeType: string = 'image/jpeg'
): Promise<PhotoAnalysisResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  const currentDateTime = getCurrentDateTime()

  const prompt = `Analyze this photo of a to-do list, notes, whiteboard, or task list. Extract all tasks and subtasks with their details.

Current date: ${currentDateTime.date}
Current day: ${currentDateTime.dayOfWeek}
Current time: ${currentDateTime.time}

Extract and identify:
1. Task titles (main tasks and subtasks)
2. Task descriptions/notes (any additional details written for each task)
3. Location information (if mentioned: "at grocery store", "office", "home", etc.)
4. Time information (if mentioned: "3pm", "morning", "after lunch", "by Friday", etc.)
5. Due dates (if mentioned: dates, days, deadlines - calculate exact dates based on current date)
6. Task hierarchy (which items are main tasks vs subtasks based on indentation, bullets, numbering, visual structure)
7. Tags/categories (suggest relevant tags based on content: "shopping", "work", "school", "home", "errands", etc.)
8. Priority indicators (if marked as urgent, important, high priority, etc.)

Return ONLY valid JSON in this exact format:
{
  "tasks": [
    {
      "title": "Buy groceries",
      "description": "Need items for dinner party",
      "location": "Whole Foods Market",
      "time": "before 6pm",
      "due_date": "2024-03-15",
      "type": "main",
      "subtasks": [
        {
          "title": "Get milk",
          "notes": "organic, 2%"
        },
        {
          "title": "Buy bread",
          "notes": "sourdough"
        }
      ],
      "suggested_tags": ["shopping", "errands"],
      "priority": "medium"
    }
  ]
}

Rules:
- Identify main tasks vs subtasks based on visual hierarchy (indentation, bullets, numbering)
- If an item is indented or numbered as a sub-item, it's a subtask
- Calculate exact dates for relative expressions (e.g., "tomorrow" means the day after ${currentDateTime.date})
- Extract time if mentioned (convert to 24-hour format if needed)
- Suggest relevant tags based on task content
- If priority is marked (urgent, important, etc.), include it
- Clean up task titles (remove filler words, fix typos)
- Return empty array if no tasks detected

Return ONLY valid JSON, no markdown, no explanations.`

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4o supports vision
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON from response
    let parsed: PhotoAnalysisResult
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error('Failed to parse AI response. Please try again with a clearer image.')
    }

    // Validate structure
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid response format: expected tasks array')
    }

    // Ensure all tasks have required fields
    const validatedTasks = parsed.tasks
      .filter((task) => task.title && task.title.trim().length > 0)
      .map((task) => ({
        ...task,
        title: task.title.trim(),
        description: task.description?.trim(),
        location: task.location?.trim(),
        time: task.time?.trim(),
        type: task.type || 'main',
        subtasks: task.subtasks?.filter((st) => st.title && st.title.trim().length > 0) || [],
      }))

    if (validatedTasks.length === 0) {
      throw new Error('No tasks detected in the image. Please try a clearer photo of your to-do list.')
    }

    return {
      tasks: validatedTasks,
    }
  } catch (error) {
    console.error('Error analyzing photo:', error)
    throw error
  }
}

/**
 * Detect tags from input text
 */
function detectTags(input: string): string[] {
  const lowerInput = input.toLowerCase()
  const tags: string[] = []

  // School tag detection
  const schoolKeywords = ['school', 'okul', 'homework', 'ödev', 'ders', 'lesson', 'exam', 'sınav', 'assignment', 'ödev']
  if (schoolKeywords.some(keyword => lowerInput.includes(keyword))) {
    tags.push('school')
  }

  // Work tag detection
  const workKeywords = ['work', 'iş', 'meeting', 'toplantı', 'project', 'proje', 'report', 'rapor', 'business', 'işletme']
  if (workKeywords.some(keyword => lowerInput.includes(keyword))) {
    tags.push('work')
  }

  // Home tag detection
  const homeKeywords = ['home', 'ev', 'shopping', 'alışveriş', 'house', 'ev işi', 'chore', 'grocery', 'market']
  if (homeKeywords.some(keyword => lowerInput.includes(keyword))) {
    tags.push('home')
  }

  return tags
}

/**
 * Parse natural language input into a task with enhanced date/time and tag detection
 */
export async function parseNaturalLanguageTask(
  input: string
): Promise<{ 
  title: string
  description?: string
  priority?: 'high' | 'medium' | 'low'
  deadline?: string
  time?: string
  tags?: string[]
}> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }

  // Get current date/time information
  const currentDateTime = getCurrentDateTime()

  // Detect tags from input
  const detectedTags = detectTags(input)

  const prompt = `Current date: ${currentDateTime.date}
Current day: ${currentDateTime.dayOfWeek} (${currentDateTime.dayOfWeekTurkish})
Current time: ${currentDateTime.time}

User input: "${input}"

Parse this natural language task input and return ONLY JSON in this exact format:
{
  "title": "clean, concise task title",
  "dueDate": "YYYY-MM-DD or null",
  "time": "HH:MM or null",
  "tags": ["school" or "work" or "home" or empty array],
  "priority": "low" or "medium" or "high" or null
}

CRITICAL: Title Cleaning Rules (MOST IMPORTANT):
1. Clean and improve the title:
   - Remove filler words: "like", "probably", "thing", "stuff", "falan", "falan filan", "vs", "etc"
   - Remove unnecessary phrases: "i need to", "i should", "i have to", "i want to", "i'm going to"
   - Fix typos and grammar errors
   - Capitalize properly (Title Case)
   - Make it concise (2-5 words ideal, max 8 words)
   - Remove redundant words
   - Handle Turkish input: translate to clean Turkish or English as appropriate
   - Handle mixed language: use the primary language detected

2. Title Examples:
   - "i need to like finish that homework thing for school tomorrow" → "Finish homework"
   - "buy milk and bread from market" → "Buy milk and bread"
   - "i should probably call mom because i haven't talked to her in a while" → "Call mom"
   - "marketten süt ekmek falan alıcam yarın" → "Marketten alışveriş yap" or "Buy groceries"
   - "finish the ödev for okul tomorrow saat 5" → "Finish homework"
   - "finsh homwork tmrw" → "Finish homework"
   - "i need to like do that thing" → Extract the actual task, remove filler

3. Date/Time Rules:
   - Calculate exact dates for relative expressions:
     * "next Thursday" / "haftaya perşembe" = next occurrence of Thursday
     * "next week today" / "haftaya bugün" = same day next week
     * "tomorrow" / "yarın" = tomorrow's date
     * Today is ${currentDateTime.dayOfWeek}, ${currentDateTime.date}
   - Extract time if mentioned (e.g., "at 3pm", "saat 15:00", "5'te")
   
4. Tag Detection:
   - "school" tag: "school", "okul", "homework", "ödev", "ders", "exam", "sınav"
   - "work" tag: "work", "iş", "meeting", "toplantı", "project", "proje", "report", "rapor"
   - "home" tag: "home", "ev", "shopping", "alışveriş", "market", "grocery"
   
5. Priority Detection:
   - "high": urgent, important, asap, acil, önemli
   - "medium": default for tasks with deadlines
   - "low": default for tasks without urgency

Return ONLY valid JSON, no explanation. The title MUST be clean, concise, and well-formatted.`

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful task management assistant. Your primary job is to clean and improve messy task descriptions into clean, concise, well-formatted task titles. Remove filler words, fix typos, correct grammar, and make titles concise (2-5 words ideal). Handle Turkish and mixed-language input. Always return valid JSON only, no markdown, no explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON from response
    let parsed: any
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error('Failed to parse AI response')
    }

    // Process the parsed data
    let deadline: string | undefined = undefined
    let time: string | undefined = undefined

    // If dueDate is provided, parse it
    if (parsed.dueDate) {
      // Try to parse as relative date first
      const relativeDate = parseRelativeDate(parsed.dueDate)
      if (relativeDate) {
        // Parse time if provided
        if (parsed.time) {
          const parsedTime = parseTime(parsed.time)
          if (parsedTime) {
            time = parsedTime
            deadline = combineDateTime(relativeDate, parsedTime)
          } else {
            deadline = combineDateTime(relativeDate, null)
          }
        } else {
          deadline = combineDateTime(relativeDate, null)
        }
      } else {
        // Try to parse as ISO date
        try {
          const date = parseISO(parsed.dueDate)
          if (parsed.time) {
            const parsedTime = parseTime(parsed.time)
            if (parsedTime) {
              time = parsedTime
              deadline = combineDateTime(date, parsedTime)
            } else {
              deadline = combineDateTime(date, null)
            }
          } else {
            deadline = combineDateTime(date, null)
          }
        } catch {
          // If parsing fails, try relative date parsing on the string
          const relativeDate = parseRelativeDate(parsed.dueDate)
          if (relativeDate) {
            deadline = combineDateTime(relativeDate, parsed.time || null)
            if (parsed.time) {
              time = parseTime(parsed.time) || undefined
            }
          }
        }
      }
    }

    // Merge detected tags with AI-suggested tags
    const allTags = [...new Set([...detectedTags, ...(parsed.tags || [])])]

    return {
      title: parsed.title || input,
      description: parsed.description || undefined,
      priority: parsed.priority || undefined,
      deadline,
      time,
      tags: allTags.length > 0 ? allTags : undefined,
    }
  } catch (error) {
    console.error('Error parsing natural language task:', error)
    
    // Fallback: try to extract basic info
    const detectedTags = detectTags(input)
    const relativeDate = parseRelativeDate(input)
    
    return {
      title: input,
      description: undefined,
      priority: undefined,
      deadline: relativeDate ? combineDateTime(relativeDate, null) : undefined,
      tags: detectedTags.length > 0 ? detectedTags : undefined,
    }
  }
}

