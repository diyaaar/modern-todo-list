import { useState } from 'react'
import { LogOut, User, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { AvatarUploadModal } from './AvatarUploadModal'

export function Header() {
  const { user, signOut, avatarUrl } = useAuth()
  const navigate = useNavigate()
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <header className="bg-background-secondary border-b border-background-tertiary px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Modern ToDo List</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-2 text-text-secondary">
                  <span className="text-sm">{user.email}</span>
                </div>
                
                {/* Avatar */}
                <div className="relative group">
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-background-tertiary hover:border-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
                    title="Change profile picture"
                    aria-label="Change profile picture"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-background-tertiary flex items-center justify-center">
                        <User className="w-5 h-5 text-text-tertiary" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </button>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-background-tertiary hover:bg-background-tertiary/80 active:scale-95 text-text-secondary rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <AvatarUploadModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={avatarUrl}
        />
      )}
    </>
  )
}

