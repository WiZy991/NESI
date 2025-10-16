'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserProvider } from '@/context/UserContext'
import Header from '@/components/Header'
import { Toaster } from 'sonner'
import LoadingSpinner from '@/components/LoadingSpinner'
import Starfield from '@/components/Starfield'

const THEME_KEY = 'nesi_theme'
const ANIM_KEY  = 'nesi_anim'

function applyPersistedPrefs() {
  const root = document.documentElement
  const theme = (localStorage.getItem(THEME_KEY) as 'dark'|'light'|'auto') || 'auto'
  const anim  = localStorage.getItem(ANIM_KEY) || 'on'

  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)

  if (anim === 'off') root.classList.add('no-anim')
  else root.classList.remove('no-anim')
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    applyPersistedPrefs()
  }, [])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [pathname])

  const isHome = pathname === '/'
  const hideHeader = ['/login', '/register'].includes(pathname)

  return (
    <UserProvider>
      {!isHome && !hideHeader && <Header />}

      <main className="relative min-h-screen w-full overflow-hidden text-white">
        <Starfield />

        {!isHome && !hideHeader && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#04382A] opacity-40 z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_70%)] opacity-40 z-0" />
          </>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
            <LoadingSpinner />
          </div>
        )}

        <div
          className={`relative z-10 ${
            isHome ? 'w-full px-0 py-0' : 'max-w-screen-xl mx-auto px-4 py-10 md:px-8'
          } animate-fade-in`}
        >
          {children}
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </UserProvider>
  )
}
