'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NotificationDropdown({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setNotifications(data.notifications || [])
      } catch (err) {
        console.error('Ошибка загрузки уведомлений:', err)
      }
    }

    fetchNotifications()
  }, [token])

  const handleNavigate = (href: string) => {
    setOpen(false) // ✅ Закрываем выпадашку
    router.push(href) // ✅ Переходим программно
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-gray-200 hover:text-emerald-400"
      >
        <Bell className="w-6 h-6" />
        {notifications.some((n) => !n.read) && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 bg-black/90 border border-emerald-500/30 rounded-xl shadow-lg p-4">
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">
              Нет новых уведомлений
            </p>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <li
                  key={n.id}
                  className="p-3 rounded-lg border border-gray-700 hover:border-emerald-500 transition bg-black/60"
                >
                  <p className="text-gray-300 text-sm mb-1">{n.message}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                  {n.link && (
                    <button
                      onClick={() => handleNavigate(n.link)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                      Перейти →
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="text-center border-t border-gray-800 mt-3 pt-2">
            <button
              onClick={() => handleNavigate('/notifications')}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition"
            >
              Перейти к уведомлениям →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
