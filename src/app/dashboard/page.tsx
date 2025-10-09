'use client'

import { useUser } from '@/context/UserContext'
import Onboarding from '@/components/Onboarding'

export default function DashboardPage() {
  const { user } = useUser()

  return (
    <div className="p-8 text-white">
      {user && <Onboarding role={user.role} />}
      <h1 className="text-3xl font-bold mb-4 text-emerald-400">
        Добро пожаловать, {user?.fullName || 'пользователь'}!
      </h1>
      <p className="text-gray-400">
        Здесь будут появляться ваши задачи, уведомления и статистика NESI.
      </p>
    </div>
  )
}
