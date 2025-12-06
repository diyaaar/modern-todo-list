import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smile } from 'lucide-react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import { useWorkspaces } from '../contexts/WorkspacesContext'
import { useToast } from '../contexts/ToastContext'
import { WORKSPACE_COLORS, Workspace } from '../types/workspace'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  editingWorkspace?: Workspace | null
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  editingWorkspace,
}: CreateWorkspaceModalProps) {
  const { createWorkspace, updateWorkspace } = useWorkspaces()
  const { showToast } = useToast()
  const [name, setName] = useState(editingWorkspace?.name || '')
  const [selectedIcon, setSelectedIcon] = useState<string>(editingWorkspace?.icon || '📋')
  const [selectedColor, setSelectedColor] = useState<string>(editingWorkspace?.color || WORKSPACE_COLORS[0].value)
  const [saving, setSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editingWorkspace) {
        setName(editingWorkspace.name)
        setSelectedIcon(editingWorkspace.icon)
        setSelectedColor(editingWorkspace.color)
      } else {
        setName('')
        setSelectedIcon('📋')
        setSelectedColor(WORKSPACE_COLORS[0].value)
      }
    }
  }, [isOpen, editingWorkspace])

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Please enter a workspace name', 'error', 2000)
      return
    }

    setSaving(true)
    try {
      if (editingWorkspace) {
        await updateWorkspace(editingWorkspace.id, {
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        })
        showToast('Workspace updated', 'success', 2000)
      } else {
        await createWorkspace({
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        })
        showToast('Workspace created', 'success', 2000)
      }
      onClose()
    } catch (err) {
      console.error('Error saving workspace:', err)
      showToast('Failed to save workspace', 'error', 3000)
    } finally {
      setSaving(false)
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
          className="bg-background-secondary border border-background-tertiary rounded-t-2xl sm:rounded-lg shadow-xl max-w-md w-full z-10"
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 'auto', // Push to bottom on mobile
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-primary">
                {editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-background-tertiary rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Work, Personal, School"
                  className="w-full px-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Icon
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center gap-2 px-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg hover:border-primary/50 transition-all hover:scale-105 active:scale-95"
                  >
                    <span className="text-2xl">{selectedIcon}</span>
                    <Smile className="w-4 h-4 text-text-tertiary" />
                  </button>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <>
                        <div
                          className="fixed inset-0 z-50"
                          onClick={() => setShowEmojiPicker(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-50 mt-2 left-0 sm:left-auto"
                        >
                          <div className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl overflow-hidden">
                            <EmojiPicker
                              onEmojiClick={(emojiData: EmojiClickData) => {
                                setSelectedIcon(emojiData.emoji)
                                setShowEmojiPicker(false)
                              }}
                              width={350}
                              height={400}
                              searchDisabled={false}
                              skinTonesDisabled={true}
                            />
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {WORKSPACE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`
                        w-10 h-10 rounded-full border-2 transition-all
                        ${
                          selectedColor === color.value
                            ? 'border-text-primary scale-110'
                            : 'border-background-tertiary hover:border-primary/50'
                        }
                      `}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingWorkspace ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

