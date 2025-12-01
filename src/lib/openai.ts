import { parseRelativeDate, parseTime, combineDateTime } from '../utils/dateUtils'
import { parseISO } from 'date-fns'

export interface AISuggestion {
  suggestion: string
  priority?: 'high' | 'medium' | 'low'
}

/**
 * Generate subtask suggestions for a given task using OpenAI (via server API)
 * Combines user input with AI's intelligent suggestions
 */
export async function generateSubtaskSuggestions(
  taskTitle: string,
  taskDescription?: string | null,
  userInput?: string | null
): Promise<string[]> {
  try {
    const response = await fetch('/api/ai/generate-subtasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskTitle,
        taskDescription: taskDescription || null,
        userInput: userInput || null,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.suggestions || []
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
 * Analyze photo and extract tasks using GPT-4 Vision (via server API)
 */
export async function analyzePhotoForTasks(
  imageBase64: string,
  imageMimeType: string = 'image/jpeg'
): Promise<PhotoAnalysisResult> {
  try {
    const response = await fetch('/api/ai/analyze-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        imageMimeType,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error analyzing photo:', error)
    throw error
  }
}

/**
 * Detect tags from input text (client-side fallback)
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
 * Parse natural language input into a task with enhanced date/time and tag detection (via server API)
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
  try {
    const response = await fetch('/api/ai/parse-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Process the parsed data - parse dates/times on frontend (same logic as before)
    let deadline: string | undefined = undefined
    let time: string | undefined = undefined

    // If dueDate is provided, parse it
    if (data.dueDate) {
      // Try to parse as relative date first
      const relativeDate = parseRelativeDate(data.dueDate)
      if (relativeDate) {
        // Parse time if provided
        if (data.time) {
          const parsedTime = parseTime(data.time)
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
          const date = parseISO(data.dueDate)
          if (data.time) {
            const parsedTime = parseTime(data.time)
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
          const relativeDate = parseRelativeDate(data.dueDate)
          if (relativeDate) {
            deadline = combineDateTime(relativeDate, data.time || null)
            if (data.time) {
              time = parseTime(data.time) || undefined
            }
          }
        }
      }
    }

    return {
      title: data.title || input,
      description: data.description || undefined,
      priority: data.priority || undefined,
      deadline,
      time,
      tags: data.tags || undefined,
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

