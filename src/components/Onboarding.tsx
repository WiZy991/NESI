'use client'

import React, { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { usePathname } from 'next/navigation'

type Role = 'customer' | 'performer'
type PageKey =
  | 'dashboard'
  | 'tasks'
  | 'task-details'
  | 'create-task'
  | 'level'
  | 'podium'
  | 'my-tasks'
  | 'profile'

interface OnboardingStepGroup {
  role: Role
  page: PageKey
  steps: {
    element: string
    popover: {
      title: string
      description: string
      side?: 'top' | 'bottom' | 'left' | 'right'
    }
  }[]
}

const onboardingSteps: OnboardingStepGroup[] = [
  {
    role: 'performer',
    page: 'profile',
    steps: [
      {
        element: '[data-onboarding="edit-profile-btn"]',
        popover: {
          title: 'Редактирование профиля',
          description: 'Нажми здесь, чтобы обновить информацию о себе 💼',
        },
      },
      {
        element: '[data-onboarding="level-field"]',
        popover: {
          title: 'Твой уровень',
          description: 'Следи за своим прогрессом и прокачивай навыки ⚡',
        },
      },
    ],
  },
  {
    role: 'customer',
    page: 'dashboard',
    steps: [
      {
        element: '[data-onboarding="create-task-btn"]',
        popover: {
          title: 'Создай задачу ✏️',
          description: 'Опиши, что нужно сделать — исполнители предложат свои цены.',
        },
      },
    ],
  },
]

interface OnboardingProps {
  role: Role
}

const Onboarding: React.FC<OnboardingProps> = ({ role }) => {
  const pathname = usePathname()

  useEffect(() => {
    const determinePageKey = (path: string): PageKey | null => {
      if (path === '/' || path === '/dashboard') return 'dashboard'
      if (path === '/tasks') return 'tasks'
      if (path.startsWith('/tasks/new')) return 'create-task'
      if (/^\/tasks\/\d+/.test(path)) return 'task-details'
      if (path === '/level') return 'level'
      if (path === '/podium') return 'podium'
      if (path === '/my-tasks') return 'my-tasks'
      if (path === '/profile') return 'profile'
      return null
    }

    const pageKey = determinePageKey(pathname)
    if (!pageKey) return

    const flag = `nesi_onboarding_done_${role}_${pageKey}`
    const done = localStorage.getItem(flag) === 'true'
    if (done) return

    const group = onboardingSteps.find(
      (g) => g.role === role && g.page === pageKey
    )
    if (!group) return

    //Дожидаемся, пока элементы появятся на странице
    const waitForElements = async () => {
      const allExist = () =>
        group.steps.every((s) => document.querySelector(s.element))
      let attempts = 0

      while (!allExist() && attempts < 20) {
        await new Promise((r) => setTimeout(r, 300))
        attempts++
      }

      if (!allExist()) {
        console.warn('⏳ Onboarding elements not found for', pageKey)
        return
      }

      const tour = driver({
        showProgress: true,
        nextBtnText: 'Далее →',
        prevBtnText: '← Назад',
        doneBtnText: 'Готово',
        steps: group.steps,
        onDestroyed: () => localStorage.setItem(flag, 'true'),
      })

      tour.drive()
    }

    waitForElements()
  }, [pathname, role])

  return null
}

export default Onboarding
