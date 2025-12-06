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
      <header className="bg-background-secondary border-b border-background-tertiary px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary truncate">Modern ToDo List</h1>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 flex-shrink-0">
            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <div className="hidden md:flex items-center gap-2 text-text-secondary">
                  <span className="text-sm truncate max-w-[150px]">{user.email}</span>
                </div>
                
                {/* Avatar */}
                <div className="relative group">
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-background-tertiary hover:border-primary active:border-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary touch-manipulation"
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
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-text-tertiary" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </button>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2 min-h-[44px] bg-background-tertiary hover:bg-background-tertiary/80 active:scale-95 text-text-secondary rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary touch-manipulation"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
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

