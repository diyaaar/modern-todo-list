import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { WorkspacesProvider } from './contexts/WorkspacesContext'
import { TasksProvider } from './contexts/TasksContext'
import { TagsProvider } from './contexts/TagsContext'
import { AttachmentsProvider } from './contexts/AttachmentsContext'
import { ToastProvider } from './contexts/ToastContext'
import { UndoSnackbarProvider } from './contexts/UndoSnackbarContext'
import { CalendarProvider } from './contexts/CalendarContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { SignUpPage } from './pages/SignUpPage'
import { HomePage } from './pages/HomePage'
import { ConfigError } from './components/ConfigError'
import { initializationError } from './lib/supabase'

function App() {
  // Show config error if initialization failed
  if (initializationError) {
    return <ConfigError />
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <UndoSnackbarProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <WorkspacesProvider>
                      <TagsProvider>
                        <AttachmentsProvider>
                          <TasksProvider>
                            <CalendarProvider>
                              <Layout>
                                <HomePage />
                              </Layout>
                            </CalendarProvider>
                          </TasksProvider>
                        </AttachmentsProvider>
                      </TagsProvider>
                    </WorkspacesProvider>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </UndoSnackbarProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

