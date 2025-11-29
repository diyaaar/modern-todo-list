import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabase'

// Lazy initialization - only get client when needed
const getSupabase = () => getSupabaseClient()

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  avatarUrl: string | null
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  getCurrentUser: () => Promise<User | null>
  updateAvatar: (avatarUrl: string | null) => Promise<void>
  refreshAvatar: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Fetch avatar URL from users table
  const fetchAvatar = useCallback(async (userId: string) => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching avatar:', error)
        setAvatarUrl(null)
        return
      }

      setAvatarUrl(data?.avatar_url || null)
    } catch (err) {
      console.error('Error fetching avatar:', err)
      setAvatarUrl(null)
    }
  }, [])

  useEffect(() => {
    try {
      const supabase = getSupabase()
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchAvatar(session.user.id)
        }
        setLoading(false)
      })

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchAvatar(session.user.id)
        } else {
          setAvatarUrl(null)
        }
        setLoading(false)
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      setLoading(false)
      // Error will be handled by ErrorBoundary
    }
  }, [fetchAvatar])

  const signUp = async (email: string, password: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
  }

  const getCurrentUser = async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  const updateAvatar = async (newAvatarUrl: string | null) => {
    if (!user) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating avatar:', error)
        throw error
      }

      setAvatarUrl(newAvatarUrl)
    } catch (err) {
      console.error('Error updating avatar:', err)
      throw err
    }
  }

  const refreshAvatar = async () => {
    if (!user) return
    await fetchAvatar(user.id)
  }

  const value = {
    user,
    session,
    loading,
    avatarUrl,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    updateAvatar,
    refreshAvatar,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

