import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Plus, Edit2, Loader2 } from 'lucide-react'
import { DetectedTask } from '../lib/openai'
import { useTasks } from '../contexts/TasksContext'
import { useTags } from '../contexts/TagsContext'
import { useWorkspaces } from '../contexts/WorkspacesContext'
import { useToast } from '../contexts/ToastContext'
import { format, parseISO } from 'date-fns'

interface TaskPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  detectedTasks: DetectedTask[]
  onTasksCreated: () => void
}

interface EditableTask extends DetectedTask {
  id: string
  selected: boolean
  editing: boolean
  parentTaskId?: string
}

export function TaskPreviewModal({
  isOpen,
  onClose,
  detectedTasks,
  onTasksCreated,
}: TaskPreviewModalProps) {
  const { createTask } = useTasks()
  const { tags, createTag, addTagToTask } = useTags()
  const { currentWorkspaceId } = useWorkspaces()
  const { showToast } = useToast()
  const [editableTasks, setEditableTasks] = useState<EditableTask[]>([])
  const [creating, setCreating] = useState(false)

  // Initialize editable tasks from detected tasks
  useEffect(() => {
    if (detectedTasks.length > 0) {
      const initialized: EditableTask[] = detectedTasks.map((task, index) => ({
        ...task,
        id: `detected-${index}`,
        selected: true,
        editing: false,
        // Flatten subtasks into separate tasks
        subtasks: task.subtasks || [],
      }))
      setEditableTasks(initialized)
    }
  }, [detectedTasks])

  const toggleTaskSelection = (taskId: string) => {
    setEditableTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, selected: !task.selected } : task
      )
    )
  }

  const toggleEditing = (taskId: string) => {
    setEditableTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, editing: !task.editing } : task
      )
    )
  }

  const updateTaskField = (
    taskId: string,
    field: keyof EditableTask,
    value: any
  ) => {
    setEditableTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, [field]: value } : task
      )
    )
  }


  const setTaskType = (taskId: string, type: 'main' | 'subtask', parentId?: string) => {
    setEditableTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, type, parentTaskId: parentId }
          : task
      )
    )
  }

  const handleCreateTags = async (suggestedTags: string[]): Promise<Map<string, string>> => {
    const tagIdMap = new Map<string, string>() // tag name -> tag id
    
    // First, map existing tags
    tags.forEach((tag) => {
      tagIdMap.set(tag.name.toLowerCase(), tag.id)
    })

    // Create missing tags
    const existingTagNames = new Set(tags.map((t) => t.name.toLowerCase()))
    const tagsToCreate = suggestedTags.filter(
      (tag) => !existingTagNames.has(tag.toLowerCase())
    )

    for (const tagName of tagsToCreate) {
      try {
        const newTag = await createTag({
          name: tagName,
          color: '#3b82f6', // Default blue color
        })
        if (newTag) {
          tagIdMap.set(tagName.toLowerCase(), newTag.id)
        }
      } catch (err) {
        console.warn('Failed to create tag:', tagName, err)
      }
    }

    return tagIdMap
  }

  const handleAddTasks = async () => {
    if (!currentWorkspaceId) {
      showToast('No workspace selected', 'error', 3000)
      return
    }

    const selectedTasks = editableTasks.filter((t) => t.selected)
    if (selectedTasks.length === 0) {
      showToast('Please select at least one task', 'error', 2000)
      return
    }

    setCreating(true)

    try {
      // First, create all main tasks
      const mainTasks = selectedTasks.filter((t) => t.type === 'main')
      const createdMainTasks: { [key: string]: string } = {}

      // Create all tags first
      const allSuggestedTags = new Set<string>()
      mainTasks.forEach((task) => {
        if (task.suggested_tags) {
          task.suggested_tags.forEach((tag) => allSuggestedTags.add(tag))
        }
      })
      const tagIdMap = await handleCreateTags(Array.from(allSuggestedTags))

      // Create main tasks
      for (const task of mainTasks) {
        // Parse deadline
        let deadline: string | null = null
        if (task.due_date) {
          try {
            // Try parsing as ISO date first
            const parsedDate = parseISO(task.due_date)
            if (!isNaN(parsedDate.getTime())) {
              deadline = parsedDate.toISOString()
            } else {
              // Try as regular date string
              const date = new Date(task.due_date)
              if (!isNaN(date.getTime())) {
                deadline = date.toISOString()
              }
            }
          } catch {
            // Invalid date, skip
          }
        }

        const newTask = await createTask({
          title: task.title,
          description: task.description || null,
          priority: task.priority || null,
          deadline: deadline,
          workspace_id: currentWorkspaceId,
        })

        if (newTask) {
          createdMainTasks[task.id] = newTask.id

          // Add tags to task
          if (task.suggested_tags && task.suggested_tags.length > 0) {
            for (const tagName of task.suggested_tags) {
              const tagId = tagIdMap.get(tagName.toLowerCase())
              if (tagId) {
                try {
                  await addTagToTask(newTask.id, tagId)
                } catch (err) {
                  console.warn('Failed to add tag to task:', err)
                }
              }
            }
          }
        }
      }

      // Then, create subtasks
      const subtasks = selectedTasks.filter((t) => t.type === 'subtask')
      for (const task of subtasks) {
        const parentId = task.parentTaskId || createdMainTasks[task.id] || null
        if (!parentId) {
          // Skip if no parent
          continue
        }

        await createTask({
          title: task.title,
          description: task.description || null,
          priority: task.priority || null,
          parent_task_id: parentId,
          workspace_id: currentWorkspaceId,
        })
      }

      // Also create subtasks that were nested in main tasks
      for (const task of mainTasks) {
        if (task.subtasks && task.subtasks.length > 0) {
          const parentId = createdMainTasks[task.id]
          if (parentId) {
            for (const subtask of task.subtasks) {
              await createTask({
                title: subtask.title,
                description: subtask.notes || null,
                parent_task_id: parentId,
                workspace_id: currentWorkspaceId,
              })
            }
          }
        }
      }

      showToast(
        `Successfully added ${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}`,
        'success',
        3000
      )
      onTasksCreated()
    } catch (err) {
      console.error('Error creating tasks:', err)
      showToast('Failed to create tasks', 'error', 3000)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  const selectedCount = editableTasks.filter((t) => t.selected).length
  const mainTasks = editableTasks.filter((t) => t.type === 'main')
  const availableParents = mainTasks.filter((t) => t.selected && t.id)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-background-tertiary">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Review Detected Tasks</h2>
              <p className="text-sm text-text-tertiary mt-1">
                {selectedCount} of {editableTasks.length} tasks selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {editableTasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg p-4 ${
                  task.selected
                    ? 'border-primary bg-primary/5'
                    : 'border-background-tertiary bg-background-tertiary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTaskSelection(task.id)}
                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      task.selected
                        ? 'bg-primary border-primary'
                        : 'border-text-tertiary'
                    }`}
                  >
                    {task.selected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 space-y-3">
                    {/* Title */}
                    {task.editing ? (
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                        className="w-full px-3 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <h3 className="text-text-primary font-medium">{task.title}</h3>
                        <button
                          onClick={() => toggleEditing(task.id)}
                          className="p-1 hover:bg-background-tertiary rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-text-tertiary" />
                        </button>
                      </div>
                    )}

                    {/* Description */}
                    {task.description && (
                      <div>
                        {task.editing ? (
                          <textarea
                            value={task.description}
                            onChange={(e) => updateTaskField(task.id, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            rows={2}
                          />
                        ) : (
                          <p className="text-sm text-text-secondary">{task.description}</p>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                      {task.location && (
                        <span className="flex items-center gap-1">
                          📍 {task.location}
                        </span>
                      )}
                      {task.time && (
                        <span className="flex items-center gap-1">
                          🕐 {task.time}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          📅 {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {task.priority && (
                        <span
                          className={`px-2 py-0.5 rounded ${
                            task.priority === 'high'
                              ? 'bg-danger/20 text-danger'
                              : task.priority === 'medium'
                              ? 'bg-warning/20 text-warning'
                              : 'bg-success/20 text-success'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {task.suggested_tags && task.suggested_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {task.suggested_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Task Type Selection */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`type-${task.id}`}
                          checked={task.type === 'main'}
                          onChange={() => setTaskType(task.id, 'main')}
                          className="text-primary"
                        />
                        <span>Main Task</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`type-${task.id}`}
                          checked={task.type === 'subtask'}
                          onChange={() => setTaskType(task.id, 'subtask')}
                          className="text-primary"
                        />
                        <span>Subtask</span>
                      </label>
                      {task.type === 'subtask' && availableParents.length > 0 && (
                        <select
                          value={task.parentTaskId || ''}
                          onChange={(e) => setTaskType(task.id, 'subtask', e.target.value)}
                          className="px-3 py-1 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select parent task...</option>
                          {availableParents.map((parent) => (
                            <option key={parent.id} value={parent.id}>
                              {parent.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Subtasks */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="ml-4 mt-2 space-y-2 border-l-2 border-background-tertiary pl-4">
                        <p className="text-xs text-text-tertiary font-medium">Subtasks:</p>
                        {task.subtasks.map((subtask, index) => (
                          <div key={index} className="text-sm text-text-secondary">
                            • {subtask.title}
                            {subtask.notes && (
                              <span className="text-text-tertiary ml-2">({subtask.notes})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-background-tertiary">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTasks}
              disabled={selectedCount === 0 || creating}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Selected Tasks ({selectedCount})
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

