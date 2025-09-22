'use client'

import { useEffect, useState } from 'react'

export default function AdminHomePage() {
  const [me, setMe] = useState<{ email: string; role: string } | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setMe(data.user)
        }
      } catch {}
    }
    run()
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Добро пожаловать в админ-панель</h2>
      {me && (
        <p className="text-sm text-gray-400">
          Вы вошли как <b>{me.email}</b> ({me.role})
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="border border-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Быстрые действия</h3>
          <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
            <li>Просмотреть новые задачи</li>
            <li>Модерировать отклики</li>
            <li>Проверить жалобы на отзывы</li>
          </ul>
        </div>
        <div className="border border-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Статистика (заглушка)</h3>
          <p className="text-sm text-gray-400">Здесь позже появятся метрики.</p>
        </div>
      </div>
    </div>
  )
}
