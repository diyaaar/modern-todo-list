import { ReactNode } from 'react'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-8 max-w-full overflow-x-hidden" role="main">
        {children}
      </main>
    </div>
  )
}

