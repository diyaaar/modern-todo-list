import { useState, FormEvent } from 'react'
import { Sparkles, Loader2, X } from 'lucide-react'
import { parseNaturalLanguageTask } from '../lib/openai'
import { useTasks } from '../contexts/TasksContext'
import { useTags } from '../contexts/TagsContext'
import { motion } from 'framer-motion'

export function NaturalLanguageInput() {
  const { createTask } = useTasks()
  const { tags, createTag, addTagToTask } = useTags()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)

    try {
      // Parse natural language input with enhanced parsing
      const parsed = await parseNaturalLanguageTask(input.trim())

      // Create task from parsed data
      const newTask = await createTask({
        title: parsed.title,
        description: parsed.description || (parsed.time ? `Time: ${parsed.time}` : undefined),
        priority: parsed.priority || null,
        deadline: parsed.deadline || null,
      })

      // Handle tags if provided
      if (newTask && parsed.tags && parsed.tags.length > 0) {
        // Tag color mapping
        const tagColors: Record<string, string> = {
          school: '#3b82f6', // blue
          work: '#ef4444',   // red
          home: '#10b981',   // green
        }

        for (const tagName of parsed.tags) {
          // Find existing tag by name (case-insensitive)
          let tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
          
          // Create tag if it doesn't exist
          if (!tag) {
            const newTag = await createTag({
              name: tagName,
              color: tagColors[tagName] || '#8b5cf6',
            })
            if (newTag) {
              tag = newTag
            }
          }

          // Add tag to task
          if (tag) {
            await addTagToTask(newTask.id, tag.id)
          }
        }
      }

      // Reset form
      setInput('')
      setIsExpanded(false)
    } catch (err) {
      console.error('Error parsing natural language:', err)
      setError(err instanceof Error ? err.message : 'Failed to create task from input')
      
      // Fallback: create task with raw input
      try {
        await createTask({
          title: input.trim(),
        })
        setInput('')
        setIsExpanded(false)
      } catch (createError) {
        console.error('Error creating fallback task:', createError)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-background-secondary border border-background-tertiary rounded-lg text-text-tertiary hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm">Create task with AI (natural language)</span>
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-background-secondary border border-background-tertiary rounded-lg p-4"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-text-primary">AI Task Creator</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false)
              setInput('')
              setError(null)
            }}
            className="p-1 hover:bg-background-tertiary rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='e.g., "Plan a wedding for next month" or "High priority: Finish project report by Friday"'
            className="w-full px-3 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-text-tertiary mt-1">
            Describe your task naturally. AI will extract title, priority, deadline, time, and tags.
            <br />
            Examples: "finish homework tomorrow", "haftaya perşembe toplantı", "iş raporu next Friday at 3pm"
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false)
              setInput('')
              setError(null)
            }}
            className="px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

