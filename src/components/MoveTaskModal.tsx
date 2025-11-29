import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { useWorkspaces } from '../contexts/WorkspacesContext'
import { useTasks } from '../contexts/TasksContext'
import { useToast } from '../contexts/ToastContext'
import { TaskWithSubtasks } from '../types/task'

interface MoveTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: TaskWithSubtasks
}

export function MoveTaskModal({ isOpen, onClose, task }: MoveTaskModalProps) {
  const { workspaces, currentWorkspaceId } = useWorkspaces()
  const { updateTask } = useTasks()
  const { showToast } = useToast()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(currentWorkspaceId)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedWorkspaceId(task.workspace_id || currentWorkspaceId)
    }
  }, [isOpen, task.workspace_id, currentWorkspaceId])

  const handleMove = async () => {
    if (!selectedWorkspaceId || selectedWorkspaceId === task.workspace_id) {
      onClose()
      return
    }

    const destinationWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId)
    const destinationName = destinationWorkspace?.name || 'workspace'

    setMoving(true)
    try {
      // Update task with workspace change - this will optimistically remove it from current workspace
      await updateTask(task.id, { workspace_id: selectedWorkspaceId }, true) // suppressToast = true
      
      // Show success toast with workspace name
      showToast(`Task moved to ${destinationName}`, 'success', 2500)
      onClose()
    } catch (err) {
      console.error('Error moving task:', err)
      showToast('Failed to move task', 'error', 3000)
    } finally {
      setMoving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-md w-full z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-primary">Move Task</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-background-tertiary rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              Move "{task.title}" to:
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {workspaces.map((workspace) => {
                const isSelected = selectedWorkspaceId === workspace.id
                const isCurrent = workspace.id === task.workspace_id
                return (
                  <button
                    key={workspace.id}
                    onClick={() => setSelectedWorkspaceId(workspace.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
                      ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-background-tertiary hover:border-primary/50'
                      }
                    `}
                  >
                    <span className="text-xl">{workspace.icon}</span>
                    <span
                      className="flex-1 text-left font-medium"
                      style={{ color: isSelected ? workspace.color : undefined }}
                    >
                      {workspace.name}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-text-tertiary">(current)</span>
                    )}
                    {isSelected && (
                      <Check className="w-5 h-5" style={{ color: workspace.color }} />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                disabled={!selectedWorkspaceId || selectedWorkspaceId === task.workspace_id || moving}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {moving ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

