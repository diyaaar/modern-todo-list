import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Loader2, Check, AlertCircle, Plus } from 'lucide-react'
import { generateSubtaskSuggestions } from '../lib/openai'
import { TaskWithSubtasks } from '../types/task'

interface AISuggestionsModalProps {
  task: TaskWithSubtasks
  isOpen: boolean
  onClose: () => void
  onAddSuggestions: (suggestions: string[]) => Promise<void>
}

export function AISuggestionsModal({
  task,
  isOpen,
  onClose,
  onAddSuggestions,
}: AISuggestionsModalProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [showInput, setShowInput] = useState(true) // Show input before generating

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSuggestions([])
      setSelectedSuggestions(new Set())
      setUserInput('')
      setShowInput(true)
      setError(null)
    }
  }, [isOpen])

  const fetchSuggestions = async () => {
    if (showInput) {
      setShowInput(false)
    }
    setLoading(true)
    setError(null)
    try {
      const generated = await generateSubtaskSuggestions(
        task.title,
        task.description || undefined,
        userInput.trim() || undefined
      )
      setSuggestions(generated)
      // Auto-select all suggestions
      setSelectedSuggestions(new Set(generated.map((_, index) => index)))
    } catch (err) {
      console.error('Error fetching suggestions:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
      setShowInput(true) // Show input again on error
    } finally {
      setLoading(false)
    }
  }

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedSuggestions(newSelected)
  }

  const handleAddSelected = async () => {
    if (selectedSuggestions.size === 0) return

    setAdding(true)
    try {
      const selected = Array.from(selectedSuggestions)
        .sort((a, b) => a - b)
        .map((index) => suggestions[index])
        .filter((s) => s.trim().length > 0)

      await onAddSuggestions(selected)
      // Reset state before closing
      setSuggestions([])
      setSelectedSuggestions(new Set())
      setUserInput('')
      setShowInput(true)
      onClose()
    } catch (err) {
      console.error('Error adding suggestions:', err)
      setError(err instanceof Error ? err.message : 'Failed to add suggestions')
    } finally {
      setAdding(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set())
    } else {
      setSelectedSuggestions(new Set(suggestions.map((_, index) => index)))
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-background-tertiary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Create subtasks for: {task.title}</h2>
                <p className="text-sm text-text-tertiary">AI will combine your ideas with smart suggestions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {showInput && !loading && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Describe subtasks you want (optional)
                  </label>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Example: postları oluştur, müzik seç, resimleri bul"
                    className="w-full px-4 py-3 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={4}
                    autoFocus
                  />
                  <p className="text-xs text-text-tertiary mt-2">
                    Optional - leave empty for AI suggestions only. You can list multiple items separated by commas.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={fetchSuggestions}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Subtasks
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-text-secondary">Generating suggestions...</p>
              </div>
            )}

            {error && (
              <div className="space-y-4">
                <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => {
                    setError(null)
                    setShowInput(true)
                  }}
                  className="w-full px-4 py-2 bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && !showInput && suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-secondary text-sm">
                    Select the subtasks you'd like to add:
                  </p>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-primary hover:text-primary-light transition-colors"
                  >
                    {selectedSuggestions.size === suggestions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all
                      ${
                        selectedSuggestions.has(index)
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-background-tertiary border-background-tertiary hover:border-primary/20'
                      }
                    `}
                    onClick={() => toggleSuggestion(index)}
                  >
                    <div
                      className={`
                        mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${
                          selectedSuggestions.has(index)
                            ? 'bg-primary border-primary'
                            : 'border-text-tertiary'
                        }
                      `}
                    >
                      {selectedSuggestions.has(index) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <p className="flex-1 text-text-primary">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && !error && suggestions.length === 0 && (
              <div className="text-center py-12 text-text-tertiary">
                <p>No suggestions available. Try again later.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && !showInput && suggestions.length > 0 && (
            <div className="flex items-center justify-between p-6 border-t border-background-tertiary">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowInput(true)
                    setSuggestions([])
                    setSelectedSuggestions(new Set())
                  }}
                  className="text-sm text-primary hover:text-primary-dark transition-colors"
                  disabled={adding}
                >
                  ← Edit Input
                </button>
                <p className="text-sm text-text-tertiary">
                  {selectedSuggestions.size} of {suggestions.length} selected
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                  disabled={adding}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedSuggestions.size === 0 || adding}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Selected ({selectedSuggestions.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

