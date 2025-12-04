import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface UndoAction {
  id: string
  message: string
  onUndo: () => Promise<void>
}

interface UndoSnackbarContextType {
  showSnackbar: (action: UndoAction) => void
  currentAction: UndoAction | null
  isOpen: boolean
  closeSnackbar: () => void
}

const UndoSnackbarContext = createContext<UndoSnackbarContextType | undefined>(undefined)

export function UndoSnackbarProvider({ children }: { children: ReactNode }) {
  const [currentAction, setCurrentAction] = useState<UndoAction | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const showSnackbar = useCallback((action: UndoAction) => {
    setCurrentAction(action)
    setIsOpen(true)
  }, [])

  const closeSnackbar = useCallback(() => {
    setIsOpen(false)
    // Clear action after animation completes
    setTimeout(() => {
      setCurrentAction(null)
    }, 300)
  }, [])

  return (
    <UndoSnackbarContext.Provider
      value={{
        showSnackbar,
        currentAction,
        isOpen,
        closeSnackbar,
      }}
    >
      {children}
    </UndoSnackbarContext.Provider>
  )
}

export function useUndoSnackbar() {
  const context = useContext(UndoSnackbarContext)
  if (context === undefined) {
    throw new Error('useUndoSnackbar must be used within an UndoSnackbarProvider')
  }
  return context
}

