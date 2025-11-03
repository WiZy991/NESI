'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { useRouter, usePathname } from 'next/navigation'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { X, Sparkles, CheckCircle2, Rocket, ArrowRight, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function WelcomeOnboarding() {
  const { user, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)

  useEffect(() => {
    // Показываем онбординг только для новых пользователей и только на главных страницах
    if (loading || !user || hasShownWelcome) return
    
    // Не показываем на страницах авторизации
    if (['/login', '/register', '/forgot-password'].includes(pathname)) return

    const onboardingKey = `nesi_onboarding_done_${user.id}`
    const hasDoneOnboarding = localStorage.getItem(onboardingKey)

    if (!hasDoneOnboarding) {
      // Небольшая задержка перед показом
      const timer = setTimeout(() => {
        setShowWelcomeModal(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [user, loading, hasShownWelcome, pathname])

  const handleStartTour = () => {
    setShowWelcomeModal(false)
    // Небольшая задержка перед началом тура
    setTimeout(() => {
      startInteractiveTour()
    }, 300)
  }

  const handleSkip = () => {
    setShowWelcomeModal(false)
    if (user) {
      localStorage.setItem(`nesi_onboarding_done_${user.id}`, 'true')
      setHasShownWelcome(true)
    }
  }

  const startInteractiveTour = () => {
    if (!user) return

    const userRole = user.role

    const steps = [
      ...(userRole === 'customer'
        ? [
            {
              element: 'a[href="/specialists"]',
              popover: {
                title: '🏆 Подиум исполнителей',
                description: 'Здесь вы можете найти и нанять сотрудников на постоянную работу! Просматривайте рейтинги, профили и опыт исполнителей, чтобы подобрать идеального специалиста для вашей команды.',
                side: 'top',
                align: 'start',
              },
            },
            {
              element: 'a[href="/tasks/new"]',
              popover: {
                title: '📝 Создание задачи',
                description: 'Нажмите здесь, чтобы опубликовать новую задачу. Укажите требования, бюджет и сроки - исполнители откликнутся! Вы можете использовать шаблоны для быстрого создания.',
                side: 'bottom',
                align: 'start',
              },
            },
            {
              element: 'a[href="/tasks"]',
              popover: {
                title: '📋 Каталог задач',
                description: 'Здесь вы найдете все доступные задачи. Используйте фильтры по категориям, дате и статусу для поиска подходящих заданий. Можно отсортировать по популярности, цене или дате.',
                side: 'top',
                align: 'start',
              },
            },
            {
              element: 'a[href="/my-tasks"]',
              popover: {
                title: '✅ Мои задачи',
                description: 'Все ваши созданные задачи в одном месте. Отслеживайте статусы выполнения, общайтесь с исполнителями и управляйте проектами.',
                side: 'top',
                align: 'start',
              },
            },
          ]
        : [
            {
              element: 'a[href="/tasks"]',
              popover: {
                title: '🌟 Найдите задание',
                description: 'Просматривайте доступные задачи, фильтруйте по категориям и откликайтесь на интересные проекты! Каждая задача содержит подробное описание и требования.',
                side: 'top',
                align: 'start',
              },
            },
            {
              element: 'a[href="/specialists"]',
              popover: {
                title: '🏆 Подиум исполнителей',
                description: 'Здесь вы можете посмотреть рейтинги и достижения других исполнителей, получить вдохновение и увидеть свой прогресс!',
                side: 'top',
                align: 'start',
              },
            },
            {
              element: 'a[href="/cert"]',
              popover: {
                title: '🎓 Сертификация',
                description: 'Пройдите сертификацию в разных категориях и повысьте свой рейтинг! Сертифицированные специалисты получают больше заказов и доверия.',
                side: 'top',
                align: 'start',
              },
            },
          ]),
          {
            element: 'button[data-onboarding-target="notifications-bell"]',
            popover: {
              title: '🔔 Уведомления',
              description: 'Здесь вы получаете все важные обновления: новые отклики, сообщения, изменения статуса задач.',
              side: 'bottom',
              align: 'center',
            },
          },
                    
          
      {
        element: 'a[href="/profile"]',
        popover: {
          title: '👤 Ваш профиль',
          description: 'Управляйте своим профилем, настройками, портфолио и просматривайте статистику. Здесь вы можете изменить пароль, настройки уведомлений и редактировать личные данные.',
          side: 'left',
          align: 'start',
        },
      },
    ].filter((step) => step.element !== undefined && step.element !== null) as any[]

    // Фильтруем шаги - проверяем только основные элементы хедера
    const validSteps = steps.filter((step) => {
      try {
        if (typeof document !== 'undefined') {
          const element = document.querySelector(step.element)
          return element !== null
        }
        return false
      } catch {
        return false
      }
    })

    // Определяем, является ли шаг последним
    const stepsWithDone = validSteps.map((step, index) => {
      const isLast = index === validSteps.length - 1
      return {
        ...step,
        popover: {
          ...step.popover,
          className: 'driverjs-popover',
          showButtons: ['next', 'previous', 'close'],
          closeBtnText: '✕ Закрыть',
          nextBtnText: isLast ? '✅ Завершить тур' : 'Далее →',
          prevBtnText: '← Назад',
          doneBtnText: '✅ Завершить тур',
        },
      }
    })

    let currentStepIndex = 0

    // MutationObserver для отслеживания подсветки колокольчика
    const bellObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const bell = node.querySelector ? node.querySelector('button[data-onboarding-target="notifications-bell"]') as HTMLElement : null
            const isBellNode = node.hasAttribute ? node.hasAttribute('data-onboarding-target') && node.getAttribute('data-onboarding-target') === 'notifications-bell' : false
            if (bell || isBellNode) {
              const target = bell || (node as HTMLElement)
              target.style.setProperty('outline', '4px solid rgba(16, 185, 129, 1)', 'important')
              target.style.setProperty('outline-offset', '6px', 'important')
              target.style.setProperty('border-radius', '50%', 'important')
              target.style.setProperty('background', 'rgba(16, 185, 129, 0.45)', 'important')
              target.style.setProperty('box-shadow', '0 0 60px rgba(16, 185, 129, 1), 0 0 120px rgba(16, 185, 129, 0.95), 0 0 180px rgba(16, 185, 129, 0.8)', 'important')
              target.style.setProperty('transform', 'scale(1.2)', 'important')
              target.classList.add('driver-highlighted-element')
              console.log('🔔 Колокольчик подсвечен через MutationObserver!')
            }
          }
        })
      })
    })

    const driverObj = driver({
      showProgress: true,
      animate: false,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.85)',
      overlayOpacity: 0.85,
      smoothScroll: false,
      steps: stepsWithDone,
      // @ts-ignore - onStarted существует, но не типизирован
      onStarted: () => {
        // Запускаем наблюдение за DOM для подсветки колокольчика
        bellObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'data-onboarding-target']
        })
        
        // Также периодически проверяем и подсвечиваем колокольчик
        const highlightBellInterval = setInterval(() => {
          const bell = document.querySelector('button[data-onboarding-target="notifications-bell"]') as HTMLElement
          if (bell && bell.classList.contains('driver-highlighted-element')) {
            bell.style.setProperty('outline', '4px solid rgba(16, 185, 129, 1)', 'important')
            bell.style.setProperty('outline-offset', '6px', 'important')
            bell.style.setProperty('border-radius', '50%', 'important')
            bell.style.setProperty('background', 'rgba(16, 185, 129, 0.45)', 'important')
            bell.style.setProperty('box-shadow', '0 0 60px rgba(16, 185, 129, 1), 0 0 120px rgba(16, 185, 129, 0.95), 0 0 180px rgba(16, 185, 129, 0.8)', 'important')
            bell.style.setProperty('transform', 'scale(1.2)', 'important')
          }
        }, 100)
        
        // Очистка при завершении
        setTimeout(() => {
          clearInterval(highlightBellInterval)
          bellObserver.disconnect()
        }, 300000) // 5 минут максимум
      },
      onHighlightStarted: (element: any, step: any) => {
        // КРИТИЧНО: ЗАКРЫВАЕМ меню "Ещё" ВСЕГДА (оно больше не в подсказках)
        try {
          // @ts-ignore
          if (typeof window !== 'undefined' && window.__nesiSetMenuOpen) {
            // @ts-ignore
            window.__nesiSetMenuOpen(false)
          }
        } catch (err) {
          console.warn('Failed to close more menu:', err)
        }
        
        // Применяем стили НЕМЕДЛЕННО и через несколько задержек
        const applyBellHighlight = () => {
          const el = element?.node || element?.element || element
          if (el && el instanceof HTMLElement) {
            const isNotificationsBell = el.hasAttribute('data-onboarding-target') && 
              el.getAttribute('data-onboarding-target') === 'notifications-bell'
            
            if (isNotificationsBell) {
              el.style.setProperty('outline', '4px solid rgba(16, 185, 129, 1)', 'important')
              el.style.setProperty('outline-offset', '6px', 'important')
              el.style.setProperty('border-radius', '50%', 'important')
              el.style.setProperty('background', 'rgba(16, 185, 129, 0.45)', 'important')
              el.style.setProperty('box-shadow', '0 0 60px rgba(16, 185, 129, 1), 0 0 120px rgba(16, 185, 129, 0.95), 0 0 180px rgba(16, 185, 129, 0.8)', 'important')
              el.style.setProperty('z-index', '10002', 'important')
              el.style.setProperty('position', 'relative', 'important')
              el.style.setProperty('transform', 'scale(1.2)', 'important')
              el.style.setProperty('transition', 'none', 'important')
              el.classList.add('driver-highlighted-element')
              console.log('🔔 Колокольчик подсвечен в onHighlightStarted!', el)
            }
          }
        }
        
        applyBellHighlight()
        setTimeout(applyBellHighlight, 0)
        setTimeout(applyBellHighlight, 10)
        setTimeout(applyBellHighlight, 50)
      },
      onHighlighted: (element: any, step: any) => {
        // КРИТИЧНО: ЗАКРЫВАЕМ меню "Ещё" ВСЕГДА
        try {
          // @ts-ignore
          if (typeof window !== 'undefined' && window.__nesiSetMenuOpen) {
            // @ts-ignore
            window.__nesiSetMenuOpen(false)
          }
        } catch (err) {}
        
        // Усиливаем свечение через несколько попыток
        const applyHighlight = () => {
          const el = element?.node || element?.element || element
          if (el && el instanceof HTMLElement) {
            // КРИТИЧНО: Для кнопки уведомлений добавляем КРУГЛУЮ обводку и подсветку
            const isNotificationsBell = el.hasAttribute('data-onboarding-target') && 
              el.getAttribute('data-onboarding-target') === 'notifications-bell'
            
            if (isNotificationsBell) {
              // Агрессивная подсветка через setProperty с !important
              el.style.setProperty('outline', '4px solid rgba(16, 185, 129, 1)', 'important')
              el.style.setProperty('outline-offset', '6px', 'important')
              el.style.setProperty('border-radius', '50%', 'important')
              el.style.setProperty('background', 'rgba(16, 185, 129, 0.45)', 'important')
              el.style.setProperty('box-shadow', '0 0 60px rgba(16, 185, 129, 1), 0 0 120px rgba(16, 185, 129, 0.95), 0 0 180px rgba(16, 185, 129, 0.8)', 'important')
              el.style.setProperty('z-index', '10002', 'important')
              el.style.setProperty('position', 'relative', 'important')
              el.style.setProperty('transform', 'scale(1.2)', 'important')
              el.style.setProperty('transition', 'none', 'important')
              el.classList.add('driver-highlighted-element')
              
              // Также применяем через CSS класс
              document.querySelectorAll('button[data-onboarding-target="notifications-bell"]').forEach(btn => {
                (btn as HTMLElement).classList.add('driver-highlighted-element')
              })
              
              console.log('🔔 Колокольчик УСИЛЕННО подсвечен в onHighlighted!', el)
            }
          }
        }
        
        // Применяем немедленно и с задержкой
        applyHighlight()
        setTimeout(applyHighlight, 10)
        setTimeout(applyHighlight, 50)
      },
      // @ts-ignore - onActiveChange существует, но не типизирован
      onActiveChange: (element: any, step: any) => {
        // Отслеживаем текущий индекс шага
        const stepIndex = validSteps.findIndex((s) => {
          try {
            if (step?.element && typeof document !== 'undefined') {
              return s.element === step.element
            }
            return false
          } catch {
            return false
          }
        })

        if (stepIndex >= 0) {
          currentStepIndex = stepIndex
        }

        // На последнем шаге перехватываем кнопку и закрываем тур
        if (stepIndex === validSteps.length - 1) {
          const setup = () => {
            const btn = document.querySelector('.driverjs-popover button[data-step="next"]') as HTMLButtonElement
            if (btn) {
              btn.textContent = '✅ Завершить тур'
              btn.onclick = (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                // Просто закрываем
                document.querySelector('.driver-overlay')?.remove()
                document.querySelector('.driverjs-popover')?.remove()
                driverObj.destroy()
                bellObserver.disconnect()
                
                if (user) {
                  localStorage.setItem(`nesi_onboarding_done_${user.id}`, 'true')
                  setHasShownWelcome(true)
                }
                
                return false
              }
            }
          }
          
          setup()
          setTimeout(setup, 100)
          setTimeout(setup, 300)
        }
      },
      onDestroyStarted: () => {
        // Сохраняем, что онбординг пройден
        if (user) {
          localStorage.setItem(`nesi_onboarding_done_${user.id}`, 'true')
          setHasShownWelcome(true)
        }
      },
      onDestroyed: () => {
        // Дополнительная проверка при завершении
        if (user) {
          localStorage.setItem(`nesi_onboarding_done_${user.id}`, 'true')
          setHasShownWelcome(true)
        }
      },
      onDeselected: (element: any) => {
        // Убираем свечение БЕЗ transition
        const el = element?.node || element?.element || element
        if (el && el instanceof HTMLElement) {
          requestAnimationFrame(() => {
            el.style.boxShadow = ''
            el.style.outline = ''
            el.style.outlineOffset = ''
            el.style.borderRadius = ''
            el.style.background = ''
            el.style.transition = 'none'
          })
        }
      },
    })

    driverObj.drive()
  }

  const userRole = user?.role || 'customer'
  const isCustomer = userRole === 'customer'

  return (
    <AnimatePresence>
      {showWelcomeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-4 bg-gradient-to-br from-[#001a12] to-[#002a1f] border-2 border-emerald-500/50 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.4)] p-8 text-white"
          >
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.6)]"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Добро пожаловать в NESI!
              </h2>
              <p className="text-gray-300 text-lg">
                {isCustomer
                  ? 'Платформа для поиска талантов и выполнения проектов'
                  : 'Платформа для поиска интересных проектов и развития карьеры'}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Rocket className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-emerald-300 mb-1">Интерактивный тур</h3>
                  <p className="text-sm text-gray-300">
                    Познакомьтесь с платформой! Мы покажем все основные функции и поможем быстро
                    начать работу.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <BookOpen className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-emerald-300 mb-1">Быстрый старт</h3>
                  <p className="text-sm text-gray-300">
                    {isCustomer
                      ? 'Узнайте, как создавать задачи, находить исполнителей и управлять проектами.'
                      : 'Узнайте, как находить интересные проекты, откликаться на задания и повышать свой рейтинг.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-6 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all font-medium"
              >
                Пропустить
              </button>
              <button
                onClick={handleStartTour}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-lg text-white font-semibold shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all flex items-center justify-center gap-2"
              >
                Начать тур
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
