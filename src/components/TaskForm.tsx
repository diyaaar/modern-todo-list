import { useState, FormEvent, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Calendar, Flag, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { useTasks } from '../contexts/TasksContext'
import { useTags } from '../contexts/TagsContext'
import { useAttachments } from '../contexts/AttachmentsContext'
import { useAuth } from '../contexts/AuthContext'
import { TaskWithSubtasks } from '../types/task'
import { format } from 'date-fns'
import { TagSelector } from './TagSelector'
import { BackgroundImageUpload } from './BackgroundImageUpload'
import { LinkAttachmentModal } from './LinkAttachmentModal'
import { ImageAttachmentModal } from './ImageAttachmentModal'
import { BackgroundImageDisplayMode } from '../types/attachment'

interface TaskFormProps {
  task?: TaskWithSubtasks
  parentTaskId?: string
  onCancel: () => void
  onSave: () => void
}

export function TaskForm({ task, parentTaskId, onCancel, onSave }: TaskFormProps) {
  const { createTask, updateTask } = useTasks()
  const { getTaskTags, addTagToTask, removeTagFromTask } = useTags()
  const { addTaskLink, addTaskImage } = useAttachments()
  const { user } = useAuth()
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low' | null>(
    task?.priority || null
  )
  const [deadline, setDeadline] = useState(
    task?.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : ''
  )
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  
  // Attachment states for new tasks
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(task?.background_image_url || null)
  const [backgroundDisplayMode, setBackgroundDisplayMode] = useState<BackgroundImageDisplayMode>(task?.background_image_display_mode || 'thumbnail')
  const [pendingLinks, setPendingLinks] = useState<Array<{ url: string; displayName: string }>>([])
  const [showBackgroundModal, setShowBackgroundModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)

  // Load existing tags for task
  useEffect(() => {
    if (task) {
      getTaskTags(task.id).then((tags) => {
        setSelectedTagIds(tags.map((tag) => tag.id))
      })
    }
  }, [task, getTaskTags])

  const handleTagChange = async (tagIds: string[]) => {
    if (!task) {
      setSelectedTagIds(tagIds)
      return
    }

    // Update tags for existing task
    const added = tagIds.filter((id) => !selectedTagIds.includes(id))
    const removed = selectedTagIds.filter((id) => !tagIds.includes(id))

    for (const tagId of added) {
      await addTagToTask(task.id, tagId)
    }
    for (const tagId of removed) {
      await removeTagFromTask(task.id, tagId)
    }

    setSelectedTagIds(tagIds)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    let createdTaskId: string | null = null

    if (task) {
      // Update existing task
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        background_image_url: backgroundImageUrl,
        background_image_display_mode: backgroundDisplayMode,
      })
      createdTaskId = task.id
    } else {
      // Create new task
      const newTask = await createTask({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        parent_task_id: parentTaskId || null,
        background_image_url: backgroundImageUrl,
        background_image_display_mode: backgroundDisplayMode,
      })
      createdTaskId = newTask?.id || null
    }

    // Add tags to task
    if (createdTaskId) {
      const currentTags = task ? await getTaskTags(task.id) : []
      const currentTagIds = currentTags.map((t) => t.id)
      
      const added = selectedTagIds.filter((id) => !currentTagIds.includes(id))
      const removed = currentTagIds.filter((id) => !selectedTagIds.includes(id))

      for (const tagId of added) {
        await addTagToTask(createdTaskId, tagId)
      }
      for (const tagId of removed) {
        await removeTagFromTask(createdTaskId, tagId)
      }

      // Add pending links for new tasks
      if (!task && pendingLinks.length > 0) {
        for (const link of pendingLinks) {
          await addTaskLink(createdTaskId, link.url, link.displayName)
        }
      }

      // Note: Images can only be added after task creation
      // Users can add images by editing the task after it's created
    }

    onSave()
  }

  const handleBackgroundImageSave = async (url: string | null, mode: BackgroundImageDisplayMode) => {
    setBackgroundImageUrl(url)
    setBackgroundDisplayMode(mode)
    setShowBackgroundModal(false)
  }

  const handleLinkSave = async (url: string, displayName: string) => {
    if (task) {
      // For existing tasks, add immediately
      await addTaskLink(task.id, url, displayName)
    } else {
      // For new tasks, store in pending links
      setPendingLinks([...pendingLinks, { url, displayName }])
    }
    setShowLinkModal(false)
  }

  const handleImageSave = async (storagePath: string, fileName: string, fileSize: number, mimeType: string) => {
    if (task) {
      // For existing tasks, add immediately
      await addTaskImage(task.id, storagePath, fileName, fileSize, mimeType)
    } else {
      // For new tasks, ImageAttachmentModal uploads the file but we need the File object
      // We'll need to get it from the modal - for now, this won't work for new tasks
      // The modal uploads to a path that includes taskId, so we can't use it for new tasks
      // We'll disable image upload for new tasks and show a message
    }
    setShowImageModal(false)
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="bg-background-tertiary rounded-lg p-3 sm:p-4 space-y-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-primary font-medium text-sm sm:text-base">
          {task ? 'Edit Task' : parentTaskId ? 'Add Subtask' : 'New Task'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-background-secondary active:scale-95 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Close form"
        >
          <X className="w-4 h-4 text-text-tertiary" />
        </button>
      </div>

      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full px-3 py-2 bg-background-secondary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          autoFocus
          required
          aria-label="Task title"
        />
      </div>

      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="w-full px-3 py-2 bg-background-secondary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
          aria-label="Task description"
        />
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Priority Selector */}
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-text-tertiary" />
          <select
            value={priority || ''}
            onChange={(e) =>
              setPriority(
                (e.target.value as 'high' | 'medium' | 'low' | '') || null
              )
            }
            className="px-3 py-1.5 bg-background-secondary border border-background-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">No priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="px-3 py-1.5 bg-background-secondary border border-background-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tags */}
      <TagSelector selectedTagIds={selectedTagIds} onChange={handleTagChange} />

      {/* Attachment Options */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-background-tertiary">
        <button
          type="button"
          onClick={() => setShowBackgroundModal(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-primary hover:bg-background-secondary rounded transition-colors"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          {backgroundImageUrl ? 'Change Background' : 'Set Background'}
        </button>
        <button
          type="button"
          onClick={() => setShowLinkModal(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-primary hover:bg-background-secondary rounded transition-colors"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Add Link
        </button>
        {task ? (
          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-tertiary hover:text-primary hover:bg-background-secondary rounded transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Add Image
          </button>
        ) : (
          <span className="text-xs text-text-tertiary italic">
            (Add images after creating task)
          </span>
        )}
        {pendingLinks.length > 0 && (
          <span className="text-xs text-text-tertiary">
            {pendingLinks.length} link{pendingLinks.length !== 1 ? 's' : ''} pending
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-text-secondary hover:text-text-primary active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary hover:bg-primary-dark active:scale-95 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-tertiary"
          aria-label={task ? 'Save task' : 'Create task'}
        >
          {task ? 'Save' : 'Create'}
        </button>
      </div>

      {/* Background Image Modal */}
      {showBackgroundModal && user && (
        <BackgroundImageUpload
          currentImageUrl={backgroundImageUrl}
          displayMode={backgroundDisplayMode}
          onSave={handleBackgroundImageSave}
          userId={user.id}
          taskId={task?.id || 'new'}
          onClose={() => setShowBackgroundModal(false)}
        />
      )}

      {/* Link Attachment Modal */}
      {showLinkModal && (
        <LinkAttachmentModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onSave={handleLinkSave}
        />
      )}

      {/* Image Attachment Modal - Only for existing tasks */}
      {showImageModal && user && task && (
        <ImageAttachmentModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onSave={handleImageSave}
          userId={user.id}
          taskId={task.id}
        />
      )}
    </motion.form>
  )
}

