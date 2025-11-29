import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSignIn = async (email: string, password: string) => {
    return await signIn(email, password)
  }

  const handleToggleMode = () => {
    navigate('/signup')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <AuthForm mode="login" onSubmit={handleSignIn} onToggleMode={handleToggleMode} />
      </div>
    </div>
  )
}

