'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@/context/UserContext'
import { usePathname } from 'next/navigation'
import { X, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Rocket, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type OnboardingStep = {
  element: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function WelcomeOnboarding() {
  const { user, loading, token } = useUser()
  const pathname = usePathname()
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
  const [headerHeight, setHeaderHeight] = useState(80)
  const [quickTourStep, setQuickTourStep] = useState<OnboardingStep | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  // Определяем высоту хедера для выреза в overlay
  useEffect(() => {
    if (isTourActive) {
      const updateHeaderHeight = () => {
        const header = document.querySelector('header')
        if (header) {
          const rect = header.getBoundingClientRect()
          setHeaderHeight(rect.height)
        }
      }
      updateHeaderHeight()
      window.addEventListener('resize', updateHeaderHeight)
      return () => window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [isTourActive])

  useEffect(() => {
    // Обработчик события для повторного запуска онбординга
    const handleRestartOnboarding = () => {
      if (user && !['/login', '/register', '/forgot-password'].includes(pathname)) {
        // Удаляем флаг из localStorage для повторного запуска
        const onboardingKey = `nesi_onboarding_done_${user.id}`
        localStorage.removeItem(onboardingKey)
        // Небольшая задержка перед показом
        setTimeout(() => {
          setShowWelcomeModal(true)
        }, 300)
      }
    }

    window.addEventListener('restart-onboarding', handleRestartOnboarding)

    // Показываем онбординг ТОЛЬКО для новых пользователей (проверяем только localStorage, без локального состояния)
    if (loading || !user) {
      return () => {
        window.removeEventListener('restart-onboarding', handleRestartOnboarding)
      }
    }
    
    // Не показываем на страницах авторизации
    if (['/login', '/register', '/forgot-password'].includes(pathname)) {
      return () => {
        window.removeEventListener('restart-onboarding', handleRestartOnboarding)
      }
    }

    // Проверяем localStorage - это единственный источник истины
    const onboardingKey = `nesi_onboarding_done_${user.id}`
    const hasDoneOnboarding = localStorage.getItem(onboardingKey)

    // Если пользователь уже прошел онбординг, не показываем его снова
    if (hasDoneOnboarding === 'true') {
      return () => {
        window.removeEventListener('restart-onboarding', handleRestartOnboarding)
      }
    }

    // Проверяем, является ли пользователь новым (создан менее 24 часов назад)
    // Для старых пользователей не показываем онбординг автоматически
    const checkUserAge = async () => {
      try {
        // Получаем токен из контекста или из других источников
        const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('token') || document.cookie.match(/token=([^;]+)/)?.[1] || '') : '')
        if (!authToken) {
          // Если токена нет, не показываем онбординг
          return () => {
            window.removeEventListener('restart-onboarding', handleRestartOnboarding)
          }
        }
        
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user?.createdAt) {
            const userCreatedAt = new Date(data.user.createdAt)
            const now = new Date()
            const hoursSinceCreation = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60)
            
            // Показываем онбординг только если пользователь создан менее 24 часов назад
            if (hoursSinceCreation > 24) {
              // Старый пользователь - сохраняем флаг, чтобы не показывать онбординг
              localStorage.setItem(onboardingKey, 'true')
              return () => {
                window.removeEventListener('restart-onboarding', handleRestartOnboarding)
              }
            }
          }
        }
      } catch (err) {
        console.error('Ошибка проверки возраста пользователя:', err)
        // При ошибке тоже не показываем онбординг
        localStorage.setItem(onboardingKey, 'true')
        return () => {
          window.removeEventListener('restart-onboarding', handleRestartOnboarding)
        }
      }
      
      // Показываем онбординг только новым пользователям
      // Небольшая задержка перед показом
      const timer = setTimeout(() => {
        setShowWelcomeModal(true)
      }, 1500)
      
      return () => {
        clearTimeout(timer)
        window.removeEventListener('restart-onboarding', handleRestartOnboarding)
      }
    }
    
    const cleanup = checkUserAge()
    return cleanup
  }, [user, loading, pathname])

  // Получаем шаги онбординга
  const getSteps = (): OnboardingStep[] => {
    if (!user) return []

    const userRole = user.role

    const baseSteps: OnboardingStep[] = [
      {
        element: 'button[data-onboarding-target="notifications-bell"]',
        title: '🔔 Уведомления',
        description: 'Здесь вы получаете все важные обновления: новые отклики, сообщения, изменения статуса задач.',
        position: 'bottom',
      },
      {
        element: 'a[data-onboarding-target="nav-profile"]',
        title: '👤 Ваш профиль',
        description: 'Управляйте своим профилем, настройками, портфолио и просматривайте статистику. Здесь вы можете изменить пароль, настройки уведомлений и редактировать личные данные.',
        position: 'bottom',
      },
      {
        element: 'button[data-onboarding-target="more-menu"]',
        title: '📂 Меню "Ещё"',
        description: 'Здесь находятся дополнительные функции: чаты для общения, сообщество, запросы найма, аналитика, портфолио и настройки. Нажмите, чтобы открыть меню и увидеть все возможности платформы.',
        position: 'bottom',
      },
    ]

    if (userRole === 'customer') {
      return [
        {
          element: 'a[data-onboarding-target="nav-specialists"]',
                title: '🏆 Подиум исполнителей',
                description: 'Здесь вы можете найти и нанять сотрудников на постоянную работу! Просматривайте рейтинги, профили и опыт исполнителей, чтобы подобрать идеального специалиста для вашей команды.',
          position: 'bottom',
            },
            {
          element: 'a[data-onboarding-target="nav-create-task"]',
                title: '📝 Создание задачи',
                description: 'Нажмите здесь, чтобы опубликовать новую задачу. Укажите требования, бюджет и сроки - исполнители откликнутся! Вы можете использовать шаблоны для быстрого создания.',
          position: 'bottom',
            },
            {
          element: 'a[data-onboarding-target="nav-tasks"]',
                title: '📋 Каталог задач',
                description: 'Здесь вы найдете все доступные задачи. Используйте фильтры по категориям, дате и статусу для поиска подходящих заданий. Можно отсортировать по популярности, цене или дате.',
          position: 'bottom',
            },
            {
          element: 'a[data-onboarding-target="nav-my-tasks"]',
                title: '✅ Мои задачи',
                description: 'Все ваши созданные задачи в одном месте. Отслеживайте статусы выполнения, общайтесь с исполнителями и управляйте проектами.',
          position: 'bottom',
              },
        ...baseSteps,
          ]
    } else {
      return [
            {
          element: 'a[data-onboarding-target="nav-tasks"]',
                title: '🌟 Найдите задание',
                description: 'Просматривайте доступные задачи, фильтруйте по категориям и откликайтесь на интересные проекты! Каждая задача содержит подробное описание и требования.',
          position: 'bottom',
            },
            {
          element: 'a[data-onboarding-target="nav-specialists"]',
                title: '🏆 Подиум исполнителей',
                description: 'Здесь вы можете посмотреть рейтинги и достижения других исполнителей, получить вдохновение и увидеть свой прогресс!',
          position: 'bottom',
            },
        {
          element: 'a[data-onboarding-target="nav-level"]',
          title: '⭐ Ваш уровень',
          description: 'Здесь отображается ваш текущий уровень и прогресс! Выполняйте задачи, проходите тесты и получайте отзывы, чтобы повышать уровень и открывать новые возможности.',
          position: 'bottom',
        },
        ...baseSteps,
      ]
    }
  }

  // Функция для подсветки элемента
  const highlightElement = (selector: string) => {
    // Сначала убираем предыдущую подсветку
    if (highlightedElement) {
      highlightedElement.style.removeProperty('outline')
      highlightedElement.style.removeProperty('outline-offset')
      highlightedElement.style.removeProperty('border-radius')
      highlightedElement.style.removeProperty('box-shadow')
      highlightedElement.style.removeProperty('z-index')
      highlightedElement.style.removeProperty('position')
      highlightedElement.style.removeProperty('background-color')
      highlightedElement.style.removeProperty('transform')
      highlightedElement.classList.remove('onboarding-highlighted')
      
      // Удаляем обертку
      // @ts-ignore
      if (highlightedElement._onboardingWrapper) {
        // @ts-ignore
        highlightedElement._onboardingWrapper.remove()
        // @ts-ignore
        highlightedElement._onboardingWrapper = null
      }
      // Также удаляем любую обертку в DOM на всякий случай
      const wrapper = document.querySelector('.onboarding-highlight-wrapper')
      if (wrapper) {
        wrapper.remove()
      }
    }

    // Закрываем меню "Ещё" если оно открыто (не открываем автоматически)
        try {
          // @ts-ignore
          if (typeof window !== 'undefined' && window.__nesiSetMenuOpen) {
            // @ts-ignore
            window.__nesiSetMenuOpen(false)
          }
        } catch (err) {
          console.warn('Failed to close more menu:', err)
        }
        
    // Находим новый элемент с несколькими попытками
    let element: HTMLElement | null = null
    let attempts = 0
    const maxAttempts = 10
    
    const findElement = () => {
      // Ищем все элементы с таким селектором
      const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>
      
      // Находим первый видимый элемент (не скрытый через display:none или visibility:hidden)
      // Предпочитаем элементы в основном хедере (не в мобильном меню)
      element = Array.from(elements).find((el) => {
        const style = window.getComputedStyle(el)
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
        const rect = el.getBoundingClientRect()
        const isInViewport = rect.width > 0 && rect.height > 0
        // Проверяем, что элемент не в мобильном меню (которое обычно скрыто или имеет специфичные классы)
        const isNotInMobileMenu = !el.closest('[class*="mobile"]') && !el.closest('[class*="Mobile"]')
        return isVisible && isInViewport && isNotInMobileMenu
      }) || Array.from(elements).find((el) => {
        const style = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return style.display !== 'none' && rect.width > 0 && rect.height > 0
      }) || elements[0] || null
      
      if (element) {
        console.log('✅ Найден элемент для подсветки:', selector, element)
      } else {
        console.warn('⚠️ Элемент не найден:', selector, 'Всего найдено элементов:', elements.length)
      }
      
      if (!element && attempts < maxAttempts) {
        attempts++
        setTimeout(findElement, 100)
        return
      }
      
      if (!element) {
        console.warn(`Элемент не найден после ${attempts} попыток: ${selector}`)
        return null
      }
      
      // Продолжаем с подсветкой
      continueHighlighting(element, currentStep)
    }
    
    findElement()
    return element
  }

  // Продолжение подсветки после нахождения элемента
  const continueHighlighting = (element: HTMLElement, stepIndex: number) => {
    // Агрессивная подсветка с !important через setProperty
    element.style.setProperty('outline', '4px solid rgba(16, 185, 129, 1)', 'important')
    element.style.setProperty('outline-offset', '8px', 'important')
    element.style.setProperty('border-radius', element.tagName === 'BUTTON' ? '50%' : '12px', 'important')
    element.style.setProperty('box-shadow', '0 0 60px rgba(16, 185, 129, 1), 0 0 120px rgba(16, 185, 129, 0.9), 0 0 180px rgba(16, 185, 129, 0.7), inset 0 0 30px rgba(16, 185, 129, 0.3)', 'important')
    element.style.setProperty('z-index', '10001', 'important')
    element.style.setProperty('position', 'relative', 'important')
    element.style.setProperty('background-color', 'rgba(16, 185, 129, 0.2)', 'important')
    element.style.setProperty('transform', 'scale(1.05)', 'important')
    element.style.setProperty('transition', 'all 0.3s ease', 'important')
    element.classList.add('onboarding-highlighted')
    
    // Дополнительная обертка для усиления эффекта
    // Удаляем старую обертку если есть
    const oldWrapper = document.querySelector('.onboarding-highlight-wrapper')
    if (oldWrapper) {
      oldWrapper.remove()
    }
    
    // Создаем новую обертку вокруг элемента
    const elementRect = element.getBoundingClientRect()
    const wrapper = document.createElement('div')
    wrapper.className = 'onboarding-highlight-wrapper'
    wrapper.style.cssText = `
      position: fixed;
      top: ${elementRect.top - 12}px;
      left: ${elementRect.left - 12}px;
      width: ${elementRect.width + 24}px;
      height: ${elementRect.height + 24}px;
      border: 3px solid rgba(16, 185, 129, 0.8);
      border-radius: 16px;
      pointer-events: none;
      z-index: 10000;
      animation: pulse-glow 2s ease-in-out infinite;
      box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
    `
    document.body.appendChild(wrapper)
    
    // Сохраняем ссылку на обертку для последующего удаления
          // @ts-ignore
    element._onboardingWrapper = wrapper

    setHighlightedElement(element)

    // Вычисляем позицию для popover с учетом размера popover
    const rect = element.getBoundingClientRect()
    const step = steps[stepIndex]
    if (!step) return
    
    const position = step.position || 'bottom'
    const popoverWidth = 320
    const popoverHeight = 250

    let top = 0
    let left = 0

    if (position === 'top') {
      top = rect.top - popoverHeight - 20
      left = rect.left + rect.width / 2 - popoverWidth / 2
    } else if (position === 'bottom') {
      top = rect.bottom + 20
      left = rect.left + rect.width / 2 - popoverWidth / 2
    } else if (position === 'left') {
      top = rect.top + rect.height / 2 - popoverHeight / 2
      left = rect.left - popoverWidth - 20
    } else if (position === 'right') {
      top = rect.top + rect.height / 2 - popoverHeight / 2
      left = rect.right + 20
    }

    // Проверяем, чтобы popover не выходил за границы экрана
    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 20
    }
    if (left < 20) {
      left = 20
    }
    if (top + popoverHeight > window.innerHeight) {
      top = window.innerHeight - popoverHeight - 20
    }
    if (top < 20) {
      top = 20
    }

    setPopoverPosition({ top, left })

    // Прокручиваем к элементу
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // Начало тура
  const startTour = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setShowWelcomeModal(false)
    setIsTourActive(true)
    setCurrentStep(0)
    
    // Задержка для рендера и обновления DOM
    setTimeout(() => {
      const step = steps[0]
      if (step) {
        highlightElement(step.element)
      }
    }, 500)
  }

  // Быстрый старт - показывает только один элемент
  const startQuickTour = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // Закрываем модальное окно и сохраняем состояние
    setShowWelcomeModal(false)
    
    // Сохраняем, что пользователь видел приветствие
    if (user) {
      const onboardingKey = `nesi_onboarding_done_${user.id}`
      localStorage.setItem(onboardingKey, 'true')
    }
    
    setIsTourActive(true)
    setQuickTourStep({
      element: isCustomer 
        ? 'a[data-onboarding-target="nav-create-task"]'
        : 'a[data-onboarding-target="nav-tasks"]',
      title: isCustomer ? '📝 Создание задачи' : '🌟 Каталог задач',
      description: isCustomer
        ? 'Нажмите здесь, чтобы опубликовать новую задачу. Укажите требования, бюджет и сроки - исполнители откликнутся!'
        : 'Просматривайте доступные задачи, фильтруйте по категориям и откликайтесь на интересные проекты!',
      position: 'bottom',
    })
    
    setCurrentStep(0)
    
    // Задержка для рендера
    setTimeout(() => {
      const quickStartElement = isCustomer 
        ? 'a[data-onboarding-target="nav-create-task"]'
        : 'a[data-onboarding-target="nav-tasks"]'
      highlightElement(quickStartElement)
    }, 500)
  }

  // Переход к следующему шагу
  const nextStep = () => {
    // Если это быстрый старт, завершаем тур при нажатии "Далее"
    if (quickTourStep) {
      completeTour()
      return
    }
    
    const steps = getSteps()
    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      
      // Задержка для обновления состояния и DOM
      setTimeout(() => {
        const step = steps[newStep]
        if (step) {
          highlightElement(step.element)
        }
      }, 200)
    } else {
      // Завершаем тур
      completeTour()
    }
  }

  // Переход к предыдущему шагу
  const prevStep = () => {
    // Если это быстрый старт, не показываем предыдущий шаг
    if (quickTourStep) {
      return
    }
    
    const steps = getSteps()
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      
      // Задержка для обновления состояния и DOM
      setTimeout(() => {
        const step = steps[newStep]
        if (step) {
          highlightElement(step.element)
        }
      }, 200)
    }
  }

  // Завершение тура
  const completeTour = () => {
    // Убираем подсветку
    if (highlightedElement) {
      highlightedElement.style.removeProperty('outline')
      highlightedElement.style.removeProperty('outline-offset')
      highlightedElement.style.removeProperty('border-radius')
      highlightedElement.style.removeProperty('box-shadow')
      highlightedElement.style.removeProperty('z-index')
      highlightedElement.style.removeProperty('position')
      highlightedElement.style.removeProperty('background-color')
      highlightedElement.style.removeProperty('transform')
      highlightedElement.classList.remove('onboarding-highlighted')
      
      // Удаляем обертку
      // @ts-ignore
      if (highlightedElement._onboardingWrapper) {
        // @ts-ignore
        highlightedElement._onboardingWrapper.remove()
      }
      
      setHighlightedElement(null)
    }
    
    // Удаляем все обертки на всякий случай
    const wrappers = document.querySelectorAll('.onboarding-highlight-wrapper')
    wrappers.forEach(w => w.remove())

    setIsTourActive(false)
    setCurrentStep(0)
    setQuickTourStep(null) // Сбрасываем быстрый старт

    // Сохраняем, что тур пройден
    if (user) {
      const onboardingKey = `nesi_onboarding_done_${user.id}`
      localStorage.setItem(onboardingKey, 'true')
    }
  }

  // Пропуск тура
  const skipTour = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setShowWelcomeModal(false)
        if (user) {
      const onboardingKey = `nesi_onboarding_done_${user.id}`
      localStorage.setItem(onboardingKey, 'true')
        }
  }

  const userRole = user?.role || 'customer'
  const isCustomer = userRole === 'customer'
  const steps = getSteps()
  // Используем quickTourStep если он есть, иначе берем из steps
  const currentStepData = quickTourStep || steps[currentStep]

  return (
    <>
      {/* Приветственное модальное окно */}
    <AnimatePresence>
      {showWelcomeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] bg-black/75"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                skipTour(e)
              }
            }}
          >
            {/* Контент - начинается ниже хедера */}
            <div className="absolute inset-x-0 top-20 bottom-0 flex items-start justify-center pt-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md mx-4"
              >
                {/* Основная карточка */}
                <div className="bg-black/90 border border-emerald-500/30 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                  {/* Кнопка закрытия */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      skipTour(e)
                    }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors z-10"
                    aria-label="Закрыть"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="p-6 text-white">
                    {/* Иконка и заголовок */}
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-emerald-500/20 rounded-full">
                        <Sparkles className="w-7 h-7 text-emerald-400" />
                      </div>
                      
                      <h2 className="text-2xl font-bold mb-2 text-emerald-400">
                Добро пожаловать в NESI!
              </h2>
                      <p className="text-gray-400 text-sm">
                {isCustomer
                  ? 'Платформа для поиска талантов и выполнения проектов'
                  : 'Платформа для поиска интересных проектов и развития карьеры'}
              </p>
            </div>

                    {/* Карточки функций */}
                    <div className="space-y-3 mb-6">
                      <div 
                        className="flex items-start gap-3 p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/30 rounded-xl transition-all cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          startTour(e)
                        }}
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-emerald-300 mb-1 text-sm">Интерактивный тур</h3>
                          <p className="text-xs text-gray-400">
                            Познакомьтесь с платформой! Мы покажем все основные функции.
                  </p>
                </div>
              </div>

                      <div 
                        className="flex items-start gap-3 p-4 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/30 rounded-xl transition-all cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          startQuickTour(e)
                        }}
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-cyan-300 mb-1 text-sm">Быстрый старт</h3>
                          <p className="text-xs text-gray-400">
                    {isCustomer
                              ? 'Узнайте, как создавать задачи и находить исполнителей.'
                              : 'Узнайте, как находить проекты и повышать рейтинг.'}
                  </p>
                </div>
              </div>
            </div>

                    {/* Кнопки */}
            <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          skipTour(e)
                        }}
                        type="button"
                        className="flex-1 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 rounded-lg text-gray-300 hover:text-white text-sm font-medium transition-colors"
                      >
                        Пропустить
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          startTour(e)
                        }}
                        type="button"
                        className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-white text-sm font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all"
                      >
                        Начать тур
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay и Popover для тура */}
      <AnimatePresence>
        {isTourActive && currentStepData && highlightedElement && (
          <>
            {/* Overlay с затемнением, но с вырезом для хедера */}
            <motion.div
              ref={overlayRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9998]"
              style={{
                maskImage: `linear-gradient(to bottom, transparent 0%, transparent ${headerHeight}px, black ${headerHeight}px, black 100%)`,
                WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, transparent ${headerHeight}px, black ${headerHeight}px, black 100%)`,
              }}
              onClick={(e) => {
                // Предотвращаем закрытие при клике на overlay
                e.stopPropagation()
              }}
            />

            {/* Popover с описанием */}
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                position: 'fixed',
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                zIndex: 10000,
                maxWidth: '320px',
                transform: 'none',
              }}
              className="w-80 bg-gradient-to-br from-[#001a12] to-[#002a1f] border-2 border-emerald-500/50 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.4)] p-6 text-white"
            >
              {/* Прогресс */}
              <div className="flex items-center justify-between mb-4">
                {!quickTourStep && (
                  <div className="text-sm text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-lg">
                    {currentStep + 1} / {steps.length}
                  </div>
                )}
                {quickTourStep && <div></div>}
                <button
                  onClick={completeTour}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Заголовок */}
              <h3 className="text-xl font-bold text-emerald-400 mb-3">
                {currentStepData.title}
              </h3>

              {/* Описание */}
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                {currentStepData.description}
              </p>

              {/* Кнопки навигации */}
              <div className="flex gap-3">
                {!quickTourStep && currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Назад
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className={`${quickTourStep || currentStep > 0 ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-lg text-white font-semibold shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all`}
                >
                  {quickTourStep ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Понятно
                    </>
                  ) : currentStep === steps.length - 1 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Завершить
                    </>
                  ) : (
                    <>
                      Далее
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
        </motion.div>
          </>
      )}
    </AnimatePresence>
    </>
  )
}
