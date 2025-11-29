import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { useAuth } from '../contexts/AuthContext'

export function SignUpPage() {
  const { signUp, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleSignUp = async (email: string, password: string) => {
    return await signUp(email, password)
  }

  const handleToggleMode = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <AuthForm mode="signup" onSubmit={handleSignUp} onToggleMode={handleToggleMode} />
      </div>
    </div>
  )
}

