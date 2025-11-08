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
import ScrollToTop from '@/components/ScrollToTop'
import AriaLiveRegion from '@/components/AriaLiveRegion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { initErrorMonitoring, trackWebVitals } from '@/lib/errorMonitoring'
import WelcomeOnboarding from '@/components/WelcomeOnboarding'
import CommandPalette from '@/components/CommandPalette'
import { initOfflineDB, onOnlineStatusChange } from '@/lib/offlineStorage'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Инициализация мониторинга ошибок и Web Vitals
  useEffect(() => {
    initErrorMonitoring()
    
    // Инициализация офлайн хранилища
    if (typeof window !== 'undefined') {
      initOfflineDB().catch((error) => {
        console.error('Ошибка инициализации офлайн хранилища:', error)
      })

      // Отслеживание изменений онлайн статуса
      const cleanup = onOnlineStatusChange((isOnline) => {
        if (isOnline) {
          console.log('🌐 Онлайн - синхронизация данных...')
          // Здесь можно добавить логику синхронизации
        } else {
          console.log('📴 Офлайн режим')
        }
      })

      return cleanup
    }
    
    // Отслеживание Web Vitals
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ onCLS, onFID, onLCP, onFCP, onTTFB }) => {
        onCLS(trackWebVitals)
        onFID(trackWebVitals)
        onLCP(trackWebVitals)
        onFCP(trackWebVitals)
        onTTFB(trackWebVitals)
      }).catch(() => {
        // Игнорируем ошибки загрузки web-vitals
      })
    }
  }, [])

  useEffect(() => {
    // Улучшенные переходы между страницами без мерцания
    // Убираем принудительное скрытие для мобильных устройств
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    
    if (!isMobile) {
      setIsVisible(false)
      setLoading(true)
      
      // Используем View Transitions API если доступен (Chrome 111+)
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        try {
          const transition = (document as any).startViewTransition(() => {
            setIsVisible(true)
            setLoading(false)
          })
          
          transition.finished.finally(() => {
            // Cleanup после завершения перехода
          })
        } catch {
          // Fallback если View Transitions не работает
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
        }
      } else {
        // Fallback для браузеров без поддержки View Transitions
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
      }
    } else {
      // На мобильных устройствах не показываем анимацию для избежания мерцания
      setIsVisible(true)
      setLoading(false)
    }
  }, [pathname])

  const isHome = pathname === '/'
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname)
  const isChatPage = pathname === '/chats'

  // Применяем overflow-hidden и h-full только для страницы чата
  useEffect(() => {
    if (isChatPage) {
      document.body.style.overflow = 'hidden'
      document.body.style.height = '100%'
      document.documentElement.style.height = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.height = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.height = ''
    }
  }, [isChatPage])

  return (
    <ErrorBoundary>
      <UserProvider>
        {/* Звёздный фон — везде кроме главной */}
        {!isHome && <Starfield />}

        {/* Хедер показываем только там, где нужно (не на главной и авторизации) */}
        {!isHome && !isAuthPage && <Header />}

        <main className={`relative w-full text-white ${isChatPage ? 'h-full overflow-hidden' : 'min-h-screen'}`} role="main">
        {/* Градиент — везде кроме главной (включая авторизацию) */}
        {!isHome && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#04382A] opacity-40 z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.25),transparent_70%)] opacity-40 z-0" />
          </>
        )}

        {/* Лоадер при смене страницы */}
        {loading && <LoadingSpinner />}

        {/* Контент */}
        <div
          className={`relative z-10 ios-transition ${
            isHome || isAuthPage
              ? 'flex items-center justify-center w-full px-0 py-0 h-full'
              : isChatPage
              ? 'flex items-stretch w-full px-0 py-0 h-full'
              : 'max-w-screen-xl mx-auto px-4 py-10 md:px-8 min-h-[calc(100vh-200px)]'
          } ${
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
      
      {/* Кнопка "Наверх" */}
      <ScrollToTop />
      
      {/* ARIA live region для скринридеров */}
      <AriaLiveRegion />
      
      {/* Онбординг для новых пользователей */}
      <WelcomeOnboarding />
      
      {/* Компонент быстрых действий (Cmd+K) */}
      <CommandPalette />
      </UserProvider>
    </ErrorBoundary>
  )
}
