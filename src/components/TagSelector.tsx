import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Trash2 } from 'lucide-react'
import { useTags } from '../contexts/TagsContext'
import { useToast } from '../contexts/ToastContext'
import { TAG_COLORS, TagColor } from '../types/tag'
import { ConfirmDialog } from './ConfirmDialog'
import { Tag } from '../types/tag'

interface TagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const { tags, createTag, deleteTag } = useTags()
  const { showToast } = useToast()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState<TagColor>(TAG_COLORS[0])
  const [creating, setCreating] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const handleCreateTag = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newTagName.trim()) return

    setCreating(true)
    try {
      const newTag = await createTag({
        name: newTagName.trim(),
        color: newTagColor,
      })
      if (newTag) {
        onChange([...selectedTagIds, newTag.id])
        setNewTagName('')
        setShowCreateForm(false)
      }
    } catch (err) {
      console.error('Error creating tag:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTag = async () => {
    if (!tagToDelete) return

    setDeleting(true)
    try {
      await deleteTag(tagToDelete.id)
      
      // Remove tag from selected tags if it was selected
      if (selectedTagIds.includes(tagToDelete.id)) {
        onChange(selectedTagIds.filter((id) => id !== tagToDelete.id))
      }
      
      showToast('Tag deleted successfully', 'success', 2000)
      setTagToDelete(null)
    } catch (err) {
      console.error('Error deleting tag:', err)
      showToast('Failed to delete tag', 'error', 3000)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-secondary mb-2">
        Tags
      </label>

      {/* Selected Tags */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          <AnimatePresence mode="popLayout">
            {tags
              .filter((tag) => selectedTagIds.includes(tag.id))
              .map((tag) => (
                <motion.span
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium group relative"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleToggleTag(tag.id)}
                    className="hover:opacity-70 transition-opacity"
                    title="Remove from selection"
                    aria-label={`Remove ${tag.name} from selection`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setTagToDelete(tag)
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger border border-background-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
                    title="Delete tag"
                    aria-label={`Delete ${tag.name} tag`}
                  >
                    <Trash2 className="w-2.5 h-2.5 text-white" />
                  </button>
                </motion.span>
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {tags
            .filter((tag) => !selectedTagIds.includes(tag.id))
            .map((tag) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="group relative"
              >
                <button
                  onClick={() => handleToggleTag(tag.id)}
                  className="px-2 py-0.5 rounded-full text-xs font-medium border border-background-tertiary hover:border-primary/50 transition-colors flex items-center gap-1"
                  style={{
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setTagToDelete(tag)
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger border border-background-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
                  title="Delete tag"
                  aria-label={`Delete ${tag.name} tag`}
                >
                  <Trash2 className="w-2.5 h-2.5 text-white" />
                </button>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Create New Tag */}
      {showCreateForm ? (
        <div className="mt-2 p-3 bg-background-tertiary rounded-lg space-y-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="w-full px-2 py-1 bg-background-secondary border border-background-tertiary rounded text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-tertiary">Color:</span>
            <div className="flex gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    newTagColor === color ? 'border-text-primary scale-110' : 'border-background-tertiary'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={creating || !newTagName.trim()}
              className="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setNewTagName('')
              }}
              className="px-3 py-1 text-text-secondary hover:text-text-primary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-primary transition-colors"
        >
          <Plus className="w-3 h-3" />
          Create new tag
        </button>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!tagToDelete}
        onClose={() => !deleting && setTagToDelete(null)}
        onConfirm={handleDeleteTag}
        title="Delete Tag"
        message={`Are you sure you want to delete the "${tagToDelete?.name}" tag? This will remove it from all tasks that use it.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="danger"
        loading={deleting}
      />
    </div>
  )
}

