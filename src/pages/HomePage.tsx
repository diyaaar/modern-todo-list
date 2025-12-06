import { useState, useRef } from 'react'
import { Plus, Camera, Calendar, List } from 'lucide-react'
import { useTasks } from '../contexts/TasksContext'
import { useWorkspaces } from '../contexts/WorkspacesContext'
import { useUndoSnackbar } from '../contexts/UndoSnackbarContext'
import { TaskList } from '../components/TaskList'
import { TaskFilters } from '../components/TaskFilters'
import { TaskForm } from '../components/TaskForm'
import { NaturalLanguageInput } from '../components/NaturalLanguageInput'
import { TaskListSkeleton } from '../components/SkeletonLoader'
import { WorkspaceNavigation } from '../components/WorkspaceNavigation'
import { PhotoTaskRecognition } from '../components/PhotoTaskRecognition'
import { UndoSnackbar } from '../components/UndoSnackbar'
import { CalendarPage } from './CalendarPage'
import { motion, AnimatePresence } from 'framer-motion'

type ViewMode = 'tasks' | 'calendar'

export function HomePage() {
  const { loading, error, filteredAndSortedTasks } = useTasks()
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaces()
  const { currentAction, isOpen, closeSnackbar } = useUndoSnackbar()
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [showPhotoRecognition, setShowPhotoRecognition] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('tasks')
  const touchStartX = useRef<number | null>(null)

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)

  // Mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return

    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    const threshold = 50 // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next workspace
        const currentIndex = workspaces.findIndex((w) => w.id === currentWorkspaceId)
        if (currentIndex < workspaces.length - 1) {
          setCurrentWorkspaceId(workspaces[currentIndex + 1].id)
        }
      } else {
        // Swipe right - previous workspace
        const currentIndex = workspaces.findIndex((w) => w.id === currentWorkspaceId)
        if (currentIndex > 0) {
          setCurrentWorkspaceId(workspaces[currentIndex - 1].id)
        }
      }
    }

    touchStartX.current = null
  }

  // Don't show full-page skeleton during workspace transitions
  // Keep existing content visible for smooth animation

  return (
    <div
      className="relative min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Subtle Gradient Background */}
      {currentWorkspace && (
        <motion.div
          key={currentWorkspaceId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.35,
            ease: [0.4, 0.0, 0.2, 1],
          }}
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `linear-gradient(to bottom, ${currentWorkspace.color}15 0%, ${currentWorkspace.color}05 50%, transparent 100%)`,
            willChange: 'opacity',
          }}
        />
      )}

      {/* Workspace Navigation - Only show on Tasks view, not Calendar */}
      {viewMode === 'tasks' && <WorkspaceNavigation />}

      {/* Tab Navigation */}
      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-1 sm:gap-2 bg-background-secondary border border-background-tertiary rounded-lg p-0.5 sm:p-1 w-full sm:w-auto max-w-[95vw] sm:max-w-none">
            <button
              onClick={() => setViewMode('tasks')}
              className={`
                flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-md transition-all duration-200 min-h-[44px] flex-1 sm:flex-initial touch-manipulation
                ${viewMode === 'tasks'
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary active:bg-background-tertiary/80'
                }
              `}
              aria-label="Tasks view"
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm font-medium">Tasks</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`
                flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-md transition-all duration-200 min-h-[44px] flex-1 sm:flex-initial touch-manipulation
                ${viewMode === 'calendar'
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary active:bg-background-tertiary/80'
                }
              `}
              aria-label="Calendar view"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm font-medium">Calendar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* View Content */}
        <AnimatePresence mode="wait">
          {viewMode === 'tasks' ? (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-1 sm:mb-2">
                    Your Tasks
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-text-tertiary">
                    {filteredAndSortedTasks.length === 0
                      ? 'Start by creating your first task'
                      : `${filteredAndSortedTasks.length} task${filteredAndSortedTasks.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowPhotoRecognition(true)}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-background-tertiary hover:bg-background-tertiary/80 active:scale-95 text-text-primary rounded-lg transition-all duration-200 font-medium"
                    aria-label="Extract tasks from photo"
                    title="Extract tasks from photo"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Photo</span>
                  </button>
                  <button
                    onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark active:scale-95 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    aria-label="Create new task"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">New Task</span>
                    <span className="sm:hidden">New</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <AnimatePresence>
                  {showNewTaskForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <TaskForm
                        onCancel={() => setShowNewTaskForm(false)}
                        onSave={() => setShowNewTaskForm(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <NaturalLanguageInput />
              </div>

              <TaskFilters />

              {/* Smooth crossfade animation for workspace transitions */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentWorkspaceId || 'no-workspace'}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0.0, 0.2, 1],
                  }}
                  style={{
                    willChange: 'transform, opacity',
                  }}
                  className="min-h-[200px]"
                >
                  {loading && filteredAndSortedTasks.length === 0 ? (
                    <TaskListSkeleton />
                  ) : (
                    <TaskList />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <CalendarPage />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Photo Task Recognition Modal */}
      <PhotoTaskRecognition
        isOpen={showPhotoRecognition}
        onClose={() => setShowPhotoRecognition(false)}
        onTasksCreated={() => {
          setShowPhotoRecognition(false)
          // Tasks will appear automatically via realtime subscription
        }}
      />

      {/* Global Undo Snackbar */}
      {currentAction && (
        <UndoSnackbar
          isOpen={isOpen}
          onUndo={currentAction.onUndo}
          onClose={closeSnackbar}
          message={currentAction.message}
        />
      )}
    </div>
  )
}

