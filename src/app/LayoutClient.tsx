'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserProvider } from '@/context/UserContext'
import Header from '@/components/Header'
import { Toaster } from 'sonner'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timeout = setTimeout(() => setLoading(false), 400) // плавнее
    return () => clearTimeout(timeout)
  }, [pathname])

  const isHome = pathname === '/'

  return (
    <UserProvider>
      {/* Хедер общий */}
      <Header />

      <main className="relative min-h-screen w-full overflow-hidden text-white">
        {/* Фон градиент + подсветка справа-снизу */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#04382A] z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_70%)] z-0" />

        {/* Лоадер */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
            <LoadingSpinner />
          </div>
        )}

        {/* Контент */}
        <div
          className={`relative z-10 ${
            isHome
              ? 'w-full px-0 py-0' // На главной — во всю ширину, без отступов
              : 'max-w-screen-xl mx-auto px-4 py-10 md:px-8' // На остальных — как раньше
          } animate-fade-in`}
        >
          {children}
        </div>
      </main>

      {/* Тосты */}
      <Toaster position="top-center" richColors />
    </UserProvider>
  )
}
