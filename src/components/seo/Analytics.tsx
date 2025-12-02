/**
 * Компонент для интеграции Google Analytics 4 и Yandex Metrika
 */

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    ym?: (id: number, event: string, ...args: any[]) => void
    dataLayer?: any[]
  }
}

// Yandex Metrika ID
const YANDEX_METRIKA_ID = 105621885

export function Analytics() {
  const pathname = usePathname()

  useEffect(() => {
    const ga4Id = process.env.NEXT_PUBLIC_GA4_ID

    // Google Analytics 4
    if (ga4Id && typeof window !== 'undefined') {
      // Инициализация GA4 (если еще не инициализирован)
      if (!window.gtag) {
        const script = document.createElement('script')
        script.async = true
        script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`
        document.head.appendChild(script)

        window.dataLayer = window.dataLayer || []
        window.gtag = function () {
          window.dataLayer.push(arguments)
        }

        window.gtag('js', new Date())
        window.gtag('config', ga4Id, {
          page_path: pathname,
        })
      } else {
        // Обновление пути при навигации
        window.gtag('config', ga4Id, {
          page_path: pathname,
        })
      }
    }

    // Yandex Metrika - используем фиксированный ID 105621885
    if (typeof window !== 'undefined') {
      // Если счетчик уже инициализирован через layout, просто отслеживаем навигацию
      if (window.ym) {
        // Отслеживание изменения страницы
        window.ym(YANDEX_METRIKA_ID, 'hit', pathname)
      }
    }
  }, [pathname])

  return null
}

/**
 * Функции для отслеживания событий
 */

export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams)
  }

  // Yandex Metrika - используем фиксированный ID 105621885
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(YANDEX_METRIKA_ID, 'reachGoal', eventName, eventParams)
  }
}

/**
 * События для отслеживания согласно ТЗ:
 * - просмотр задачи
 * - переход в профиль
 * - отклик на задачу
 * - просмотр категории
 * - поиск
 * - начало чата
 */

export const trackTaskView = (taskId: string, taskTitle: string) => {
  trackEvent('view_task', {
    task_id: taskId,
    task_title: taskTitle,
  })
}

export const trackProfileView = (userId: string, userRole: string) => {
  trackEvent('view_profile', {
    user_id: userId,
    user_role: userRole,
  })
}

export const trackTaskResponse = (taskId: string) => {
  trackEvent('task_response', {
    task_id: taskId,
  })
}

export const trackCategoryView = (categorySlug: string) => {
  trackEvent('view_category', {
    category_slug: categorySlug,
  })
}

export const trackSearch = (query: string, resultsCount: number) => {
  trackEvent('search', {
    search_query: query,
    results_count: resultsCount,
  })
}

export const trackChatStart = (chatId: string, chatType: string) => {
  trackEvent('chat_start', {
    chat_id: chatId,
    chat_type: chatType,
  })
}

