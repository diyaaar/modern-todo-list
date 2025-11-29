import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link as LinkIcon } from 'lucide-react'
import { TaskLink } from '../types/attachment'
import { useToast } from '../contexts/ToastContext'

interface LinkAttachmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (url: string, displayName: string) => Promise<void>
  link?: TaskLink | null
}

export function LinkAttachmentModal({
  isOpen,
  onClose,
  onSave,
  link,
}: LinkAttachmentModalProps) {
  const { showToast } = useToast()
  const [url, setUrl] = useState(link?.url || '')
  const [displayName, setDisplayName] = useState(link?.display_name || '')
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens/closes or link changes
  useEffect(() => {
    if (isOpen) {
      setUrl(link?.url || '')
      setDisplayName(link?.display_name || '')
    } else {
      // Reset when closing
      setUrl('')
      setDisplayName('')
    }
  }, [isOpen, link])

  /**
   * Smart URL auto-correction
   * - Adds https:// if missing
   * - Adds www. if missing (after protocol)
   * - Trims whitespace
   */
  const autoFixUrl = (inputUrl: string): string => {
    let fixedUrl = inputUrl.trim()

    // If empty, return as is
    if (!fixedUrl) {
      return fixedUrl
    }

    // If doesn't start with http:// or https://, add https://
    if (!fixedUrl.match(/^https?:\/\//i)) {
      fixedUrl = `https://${fixedUrl}`
    }

    // Extract protocol and rest of URL
    const urlMatch = fixedUrl.match(/^(https?:\/\/)(.+)$/i)
    if (urlMatch) {
      const protocol = urlMatch[1]
      let rest = urlMatch[2]

      // If rest doesn't start with www., add it
      if (!rest.match(/^www\./i)) {
        rest = `www.${rest}`
      }

      fixedUrl = `${protocol}${rest}`
    }

    return fixedUrl
  }

  /**
   * Validate URL format
   */
  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString)
      // Check if protocol is http or https
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSave = async () => {
    if (!url.trim()) {
      showToast('Please enter a URL', 'error', 3000)
      return
    }

    // Auto-fix URL
    const fixedUrl = autoFixUrl(url)

    // Validate URL after auto-fix
    if (!isValidUrl(fixedUrl)) {
      showToast('Invalid URL format. Please enter a valid link.', 'error', 3000)
      return
    }

    setSaving(true)
    try {
      await onSave(fixedUrl, displayName.trim() || fixedUrl)
      setUrl('')
      setDisplayName('')
      onClose()
    } catch (err) {
      console.error('Error saving link:', err)
      showToast('Failed to save link', 'error', 3000)
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
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-md w-full z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-primary">
                {link ? 'Edit Link' : 'Add Link'}
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
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Link URL <span className="text-danger">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Display Name <span className="text-text-tertiary">(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Design Inspiration"
                  className="w-full px-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  If empty, the URL will be used as the display name
                </p>
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
                disabled={!url.trim() || saving}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                {saving ? 'Saving...' : link ? 'Update' : 'Add Link'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

