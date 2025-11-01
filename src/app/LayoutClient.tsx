'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserProvider } from '@/context/UserContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FeedbackWidget from '@/components/FeedbackWidget'
import { Toaster } from 'sonner'
import LoadingSpinner from '@/components/LoadingSpinner'
import Starfield from '@/components/Starfield'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Начинаем переход
    setIsVisible(false)
    setLoading(true)
    
    const showTimer = setTimeout(() => {
      setIsVisible(true)
    }, 150)
    
    const loadingTimer = setTimeout(() => {
      setLoading(false)
    }, 400)
    
    return () => {
      clearTimeout(showTimer)
      clearTimeout(loadingTimer)
    }
  }, [pathname])

  const isHome = pathname === '/'
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname)
  const isChatPage = pathname === '/chats'

  return (
    <UserProvider>
      {/* Звёздный фон — везде кроме главной и авторизации */}
      {!isHome && !isAuthPage && <Starfield />}

      {/* Хедер показываем только там, где нужно */}
      {!isHome && !isAuthPage && <Header />}

      <main className="relative min-h-screen w-full overflow-hidden text-white">
        {/* Градиент — только для обычных страниц (не авторизация, не главная) */}
        {!isHome && !isAuthPage && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#04382A] opacity-40 z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_70%)] opacity-40 z-0" />
          </>
        )}

        {/* Лоадер при смене страницы */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
            <LoadingSpinner />
          </div>
        )}

        {/* Контент */}
        <div
          className={`relative z-10 ios-transition ${
            isHome || isAuthPage
              ? 'flex items-center justify-center w-full px-0 py-0'
              : isChatPage
              ? 'flex items-start justify-center w-full px-0 py-0'
              : 'max-w-screen-xl mx-auto px-4 py-10 md:px-8'
          } min-h-[calc(100vh-200px)] ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {children}
        </div>
      </main>

      {/* Футер показываем везде кроме страниц авторизации и чата */}
      {!isAuthPage && !isChatPage && <Footer />}

      {/* Виджет обратной связи показываем везде кроме авторизации и чата */}
      {!isAuthPage && !isChatPage && <FeedbackWidget />}

      {/* Уведомления */}
      <Toaster position="top-center" richColors />
    </UserProvider>
  )
}
