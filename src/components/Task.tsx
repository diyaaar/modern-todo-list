import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Check,
  Trash2,
  Edit,
  Plus,
  Calendar,
  Flag,
  Sparkles,
  Image as ImageIcon,
  Link as LinkIcon,
  Paperclip,
  X,
  Folder,
} from 'lucide-react'
import { TaskWithSubtasks } from '../types/task'
import { useTasks } from '../contexts/TasksContext'
import { useTags } from '../contexts/TagsContext'
import { useAttachments } from '../contexts/AttachmentsContext'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { getSupabaseClient } from '../lib/supabase'
import { calculateCompletionPercentage } from '../utils/taskUtils'
import { isPast, isToday } from 'date-fns'
import { getDeadlineColor, formatDeadline } from '../utils/dateUtils'
import { TaskForm } from './TaskForm'
import { AISuggestionsModal } from './AISuggestionsModal'
import { TagBadge } from './TagBadge'
import { BackgroundImageUpload } from './BackgroundImageUpload'
import { LinkAttachmentModal } from './LinkAttachmentModal'
import { ImageAttachmentModal } from './ImageAttachmentModal'
import { MoveTaskModal } from './MoveTaskModal'
import { ConfirmDialog } from './ConfirmDialog'
import { getImageUrl } from '../lib/storage'
import { TaskLink, TaskImage } from '../types/attachment'

interface TaskProps {
  task: TaskWithSubtasks
  depth?: number
}

export function Task({ task, depth = 0 }: TaskProps) {
  const { toggleTaskComplete, deleteTask, addAISuggestions, updateTask } = useTasks()
  const { getTaskTags, removeTagFromTask } = useTags()
  const { getTaskLinks, addTaskLink, updateTaskLink, deleteTaskLink, getTaskImages, addTaskImage, deleteTaskImage } = useAttachments()
  const { showToast } = useToast()
  const { user } = useAuth()
  // Persist expand/collapse state in localStorage
  const getStoredExpandedState = (): boolean => {
    try {
      const stored = localStorage.getItem(`task-expanded-${task.id}`)
      return stored !== null ? stored === 'true' : true // Default to expanded
    } catch {
      return true
    }
  }

  const [isExpanded, setIsExpanded] = useState(getStoredExpandedState)

  // Update localStorage when expand state changes
  const handleToggleExpand = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    try {
      localStorage.setItem(`task-expanded-${task.id}`, String(newState))
    } catch (err) {
      console.warn('Failed to save expand state to localStorage:', err)
    }
  }
  const [isEditing, setIsEditing] = useState(false)
  const [showAddSubtask, setShowAddSubtask] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [taskTags, setTaskTags] = useState<any[]>([])
  const [taskLinks, setTaskLinks] = useState<TaskLink[]>([])
  const [taskImages, setTaskImages] = useState<TaskImage[]>([])
  const [showBackgroundModal, setShowBackgroundModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [editingLink, setEditingLink] = useState<TaskLink | null>(null)
  const [viewingImage, setViewingImage] = useState<TaskImage | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)

  // Load task tags
  useEffect(() => {
    getTaskTags(task.id).then(setTaskTags)
  }, [task.id, getTaskTags])

  // Load task links
  useEffect(() => {
    getTaskLinks(task.id).then(setTaskLinks)
  }, [task.id, getTaskLinks])

  // Load task images
  useEffect(() => {
    getTaskImages(task.id).then(setTaskImages)
  }, [task.id, getTaskImages])

  // Handle ESC key for image modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingImage) {
        setViewingImage(null)
      }
    }
    if (viewingImage) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [viewingImage])

  // Subscribe to task_tags changes for this specific task
  useEffect(() => {
    if (!user?.id || task.id.startsWith('temp-')) {
      return
    }

    const supabase = getSupabaseClient()
    const channelName = `task-tags-${task.id}-${user.id}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_tags',
          filter: `task_id=eq.${task.id}`,
        },
        (payload) => {
          console.log('[Realtime] Task tag change for task:', task.id, payload)
          // Refresh tags when task_tags change
          getTaskTags(task.id).then(setTaskTags)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [task.id, user?.id, getTaskTags])

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromTask(task.id, tagId)
      // Optimistically update UI
      setTaskTags((prevTags) => prevTags.filter((tag) => tag.id !== tagId))
      showToast('Tag removed successfully', 'success', 2000)
    } catch (err) {
      console.error('Error removing tag:', err)
      showToast('Failed to remove tag', 'error', 3000)
      // Refresh tags on error to restore correct state
      getTaskTags(task.id).then(setTaskTags)
    }
  }

  const handleSaveBackgroundImage = async (imageUrl: string | null, displayMode: 'thumbnail' | 'icon' | null) => {
    try {
      await updateTask(task.id, {
        background_image_url: imageUrl,
        background_image_display_mode: displayMode,
      })
      showToast('Background image updated', 'success', 2000)
    } catch (err) {
      console.error('Error updating background image:', err)
      showToast('Failed to update background image', 'error', 3000)
    }
  }

  const handleAddLink = async (url: string, displayName: string) => {
    try {
      if (editingLink) {
        await updateTaskLink(editingLink.id, { url, display_name: displayName || null })
        showToast('Link updated', 'success', 2000)
        setEditingLink(null)
      } else {
        await addTaskLink(task.id, url, displayName)
        showToast('Link added', 'success', 2000)
      }
      getTaskLinks(task.id).then(setTaskLinks)
    } catch (err) {
      console.error('Error saving link:', err)
      showToast('Failed to save link', 'error', 3000)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteTaskLink(linkId)
      setTaskLinks((prev) => prev.filter((link) => link.id !== linkId))
      showToast('Link deleted', 'success', 2000)
    } catch (err) {
      console.error('Error deleting link:', err)
      showToast('Failed to delete link', 'error', 3000)
    }
  }

  const handleAddImage = async (storagePath: string, fileName: string, fileSize: number, mimeType: string) => {
    try {
      await addTaskImage(task.id, storagePath, fileName, fileSize, mimeType)
      getTaskImages(task.id).then(setTaskImages)
    } catch (err) {
      console.error('Error adding image:', err)
      showToast('Failed to add image', 'error', 3000)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteTaskImage(imageId)
      setTaskImages((prev) => prev.filter((img) => img.id !== imageId))
      showToast('Image deleted', 'success', 2000)
    } catch (err) {
      console.error('Error deleting image:', err)
      showToast('Failed to delete image', 'error', 3000)
    }
  }

  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const completionPercentage = calculateCompletionPercentage(task)
  const isOverdue = task.deadline && !task.completed && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline))

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'text-danger border-danger/30 bg-danger/10'
      case 'medium':
        return 'text-warning border-warning/30 bg-warning/10'
      case 'low':
        return 'text-success border-success/30 bg-success/10'
      default:
        return 'text-text-tertiary border-background-tertiary'
    }
  }

  const handleToggleComplete = async () => {
    await toggleTaskComplete(task.id)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false)
    await deleteTask(task.id)
  }

  if (isEditing) {
    return (
      <TaskForm
        task={task}
        onCancel={() => setIsEditing(false)}
        onSave={() => setIsEditing(false)}
      />
    )
  }

  const backgroundImageUrl = task.background_image_url
  const displayMode = task.background_image_display_mode || 'thumbnail'
  const hasAttachments = taskLinks.length > 0 || taskImages.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-2"
    >
      <motion.div
        className={`
          bg-background-secondary border border-background-tertiary rounded-lg overflow-hidden
          transition-all duration-200 hover:shadow-lg
          ${task.completed ? 'opacity-60' : ''}
          ${isOverdue ? 'border-danger/50 bg-danger/5' : ''}
        `}
        style={{ marginLeft: `${Math.min(depth * 24, 72)}px` }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {/* Background Image - Thumbnail Mode */}
        {backgroundImageUrl && displayMode === 'thumbnail' && (
          <div className="w-full h-32 sm:h-40 overflow-hidden">
            <img
              src={backgroundImageUrl}
              alt="Background"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Failed to load background image')
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={handleToggleComplete}
            className={`
              mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
              transition-all duration-200 hover:scale-110 active:scale-95
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
              ${
                task.completed
                  ? 'bg-primary border-primary'
                  : 'border-text-tertiary hover:border-primary'
              }
            `}
            aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
            aria-checked={task.completed}
            role="checkbox"
          >
            {task.completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </button>

          {/* Background Image - Icon Mode (Between Checkbox and Title) */}
          {backgroundImageUrl && displayMode === 'icon' && (
            <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border border-background-tertiary">
              <img
                src={backgroundImageUrl}
                alt="Task background"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Failed to load background image thumbnail')
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3
                  className={`
                    text-text-primary font-medium
                    ${task.completed ? 'line-through text-text-tertiary' : ''}
                  `}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-text-tertiary text-sm mt-1">{task.description}</p>
                )}

                {/* Task Meta */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {/* Priority Badge */}
                  {task.priority && (
                    <span
                      className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border
                        ${getPriorityColor()}
                      `}
                    >
                      <Flag className="w-3 h-3" />
                      {task.priority}
                    </span>
                  )}

                  {/* Deadline with color coding */}
                  {task.deadline && (
                    <span
                      className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                        ${getDeadlineColor(task.deadline)}
                        ${isOverdue ? 'bg-danger/10 border border-danger/20' : ''}
                      `}
                    >
                      <Calendar className="w-3 h-3" />
                      {formatDeadline(task.deadline, task.description?.includes('Time:') ? task.description.split('Time:')[1]?.trim() : null)}
                    </span>
                  )}

                  {/* Completion Percentage */}
                  {hasSubtasks && (
                    <span className="text-text-tertiary text-xs">
                      {completionPercentage}% complete
                    </span>
                  )}

                  {/* Tags */}
                  {taskTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {taskTags.map((tag) => (
                        <TagBadge
                          key={tag.id}
                          tag={tag}
                          size="sm"
                          onRemove={() => handleRemoveTag(tag.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {hasSubtasks && completionPercentage < 100 && (
                  <div className="mt-2 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercentage}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-primary"
                    />
                  </div>
                )}

                {/* Attachments Section */}
                {hasAttachments && (
                  <div className="mt-3 pt-3 border-t border-background-tertiary">
                    <div className="flex items-center gap-2 mb-2">
                      <Paperclip className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-medium text-text-secondary">Attachments</span>
                    </div>
                    
                    {/* Image Attachments */}
                    {taskImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {taskImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group"
                          >
                            <button
                              onClick={() => setViewingImage(img)}
                              className="relative w-16 h-16 rounded overflow-hidden border border-background-tertiary hover:border-primary transition-colors"
                            >
                              <img
                                src={getImageUrl(img.storage_path)}
                                alt={img.file_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23121212"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10"%3EImage%3C/text%3E%3C/svg%3E'
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                            <button
                              onClick={() => handleDeleteImage(img.id)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                              aria-label="Delete image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Link Attachments */}
                    {taskLinks.length > 0 && (
                      <div className="space-y-1">
                        {taskLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center gap-2 group"
                          >
                            <LinkIcon className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-sm text-primary hover:underline truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {link.display_name || link.url}
                            </a>
                            <button
                              onClick={() => {
                                setEditingLink(link)
                                setShowLinkModal(true)
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background-tertiary rounded transition-all"
                              aria-label="Edit link"
                            >
                              <Edit className="w-3 h-3 text-text-tertiary" />
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/20 rounded transition-all"
                              aria-label="Delete link"
                            >
                              <X className="w-3 h-3 text-danger" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Add Attachment Buttons */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <div className="relative group">
                    <button
                      onClick={() => setShowBackgroundModal(true)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-primary hover:bg-background-tertiary rounded transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {backgroundImageUrl ? 'Change Background' : 'Set Background'}
                    </button>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={() => {
                        setEditingLink(null)
                        setShowLinkModal(true)
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-primary hover:bg-background-tertiary rounded transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Add Link
                    </button>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-primary hover:bg-background-tertiary rounded transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Add Image
                    </button>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={() => setShowMoveModal(true)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-primary hover:bg-background-tertiary rounded transition-colors"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      Move to Page
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setShowAISuggestions(true)}
                  className="p-1.5 hover:bg-primary/10 active:scale-95 rounded transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary"
                  title="AI suggestions for subtasks"
                  aria-label="Get AI suggestions for subtasks"
                >
                  <Sparkles className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" />
                </button>
                <button
                  onClick={() => setShowAddSubtask(!showAddSubtask)}
                  className="p-1.5 hover:bg-background-tertiary active:scale-95 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Add subtask"
                  aria-label="Add subtask"
                >
                  <Plus className="w-4 h-4 text-text-tertiary" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 hover:bg-background-tertiary active:scale-95 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Edit task"
                  aria-label="Edit task"
                >
                  <Edit className="w-4 h-4 text-text-tertiary" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 hover:bg-danger/20 active:scale-95 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-danger"
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
                {hasSubtasks && (
                  <button
                    onClick={handleToggleExpand}
                    className="p-1.5 hover:bg-background-tertiary active:scale-95 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                    aria-expanded={isExpanded}
                  >
                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-text-tertiary" />
                    </motion.div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Add Subtask Form */}
            <AnimatePresence>
              {showAddSubtask && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <TaskForm
                    parentTaskId={task.id}
                    onCancel={() => setShowAddSubtask(false)}
                    onSave={() => setShowAddSubtask(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Subtasks */}
      <AnimatePresence>
        {hasSubtasks && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            {task.subtasks!.map((subtask) => (
              <Task key={subtask.id} task={subtask} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions Modal */}
      <AISuggestionsModal
        task={task}
        isOpen={showAISuggestions}
        onClose={() => setShowAISuggestions(false)}
        onAddSuggestions={async (suggestions) => {
          await addAISuggestions(task.id, suggestions)
        }}
      />

      {/* Background Image Modal */}
      {user && showBackgroundModal && (
        <BackgroundImageUpload
          currentImageUrl={task.background_image_url}
          displayMode={task.background_image_display_mode || 'thumbnail'}
          onSave={handleSaveBackgroundImage}
          userId={user.id}
          taskId={task.id}
          onClose={() => setShowBackgroundModal(false)}
        />
      )}

      {/* Link Attachment Modal */}
      <LinkAttachmentModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false)
          setEditingLink(null)
        }}
        onSave={handleAddLink}
        link={editingLink}
      />

      {/* Image Attachment Modal */}
      {user && showImageModal && (
        <ImageAttachmentModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onSave={handleAddImage}
          userId={user.id}
          taskId={task.id}
        />
      )}

      {/* Full Image View Modal */}
      {viewingImage && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-[90vw] max-h-[90vh] w-auto h-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewingImage(null)}
                className="absolute top-2 right-2 z-10 p-2 bg-background-secondary/90 hover:bg-background-tertiary rounded-full transition-colors backdrop-blur-sm"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-primary" />
              </button>
              <img
                src={getImageUrl(viewingImage.storage_path)}
                alt={viewingImage.file_name}
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                style={{ display: 'block' }}
              />
              <div className="absolute bottom-2 left-2 right-2 bg-background-secondary/90 backdrop-blur-sm rounded-lg p-3 max-w-md">
                <p className="text-sm text-text-primary font-medium truncate">{viewingImage.file_name}</p>
                {viewingImage.file_size && (
                  <p className="text-xs text-text-tertiary mt-1">
                    {(viewingImage.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This will also delete all its subtasks. This action cannot be undone.`}
        confirmText="Delete Task"
        cancelText="Cancel"
        confirmButtonColor="danger"
      />

      {/* Move Task Modal */}
      <MoveTaskModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        task={task}
      />
    </motion.div>
  )
}

