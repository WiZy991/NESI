'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Notification = {
  id: string
  message: string
  link: string | null
  createdAt: string
  read: boolean
}

export default function UserNotifications({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await res.json()
        setNotifications(data.notifications || [])
      } catch (err) {
        console.error('Ошибка загрузки уведомлений:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [token])

  if (loading)
    return <p className="text-gray-400 text-sm px-3 py-2">Загрузка уведомлений...</p>

  if (notifications.length === 0)
    return (
      <div className="text-center text-gray-500 text-sm p-4">
        <p>Уведомлений пока нет</p>
        <Link
          href="/notifications"
          className="mt-3 inline-block text-emerald-400 hover:text-emerald-300 transition"
        >
          Перейти к уведомлениям →
        </Link>
      </div>
    )

  return (
    <div>
      <ul className="space-y-3 mb-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
        {notifications.slice(0, 5).map((n) => (
          <li
            key={n.id}
            className="bg-black/50 p-3 rounded-lg border border-emerald-500/30 hover:border-emerald-400 transition"
          >
            {n.link ? (
              <Link
                href={n.link}
                className="text-emerald-400 hover:text-emerald-300 font-medium block"
              >
                {n.message}
              </Link>
            ) : (
              <span className="text-gray-300">{n.message}</span>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>

      {/* 👇 Вот это то, чего не хватало */}
      <div className="text-center border-t border-gray-800 pt-2">
        <Link
          href="/notifications"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition"
        >
          Перейти к уведомлениям →
        </Link>
      </div>
    </div>
  )
}
