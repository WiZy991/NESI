Этот?
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

  if (loading) return <p className="text-gray-400">Загрузка уведомлений...</p>

  if (notifications.length === 0) return <p className="text-gray-500">Уведомлений пока нет</p>

  return (
    <ul className="space-y-3">
      {notifications.map((n) => (
        <li key={n.id} className="bg-gray-900 p-3 rounded border border-gray-700">
          {n.link ? (
            <Link href={n.link} className="text-blue-400 hover:underline">
              {n.message}
            </Link>
          ) : (
            <span>{n.message}</span>
          )}
          <div className="text-sm text-gray-500 mt-1">
            {new Date(n.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  )
}
