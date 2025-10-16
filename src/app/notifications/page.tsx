'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { Bell, CheckCircle2, Star, MessageSquare } from 'lucide-react'

interface Notification {
  id: string
  type: string
  message: string
  link?: string
  userId?: string
  senderId?: string
  isRead: boolean
  createdAt: string
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'task':
      return <Star className="w-5 h-5 text-yellow-400" />
    case 'message':
      return <MessageSquare className="w-5 h-5 text-blue-400" />
    case 'system':
      return <CheckCircle2 className="w-5 h-5 text-green-400" />
    default:
      return <Bell className="w-5 h-5 text-gray-400" />
  }
}

export default function NotificationsPage() {
  const { token, setUnreadCount } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setNotifications(data.notifications || [])

        await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        setUnreadCount(0)
      } catch (err) {
        console.error('Ошибка загрузки уведомлений:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [token, setUnreadCount])

  if (loading) return <p className="p-6 text-gray-400">Загрузка уведомлений...</p>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-green-400">🔔 Уведомления</h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center text-gray-400 py-12">
          <p className="mt-4 text-lg">Уведомлений пока нет</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {notifications.map((n) => {
            // 🧭 Определяем корректную ссылку
            let linkTo = null

            if (n.userId || n.senderId) {
              // если есть userId/senderId — ведём в chats
              const user = n.userId || n.senderId
              linkTo = `/chats?open=${user}`
            } else if (n.link) {
              // если старый линк — подменяем /messages/ на /chats
              linkTo = n.link.includes('/messages/')
                ? '/chats'
                : n.link
            }

            return (
              <li
                key={n.id}
                className={`p-4 rounded-lg flex items-start gap-3 shadow transition ${
                  n.isRead
                    ? 'bg-black/40 border border-gray-800 text-gray-400'
                    : 'bg-black/60 border border-blue-500/50 shadow-[0_0_12px_rgba(0,150,255,0.3)] text-white'
                }`}
              >
                <div className="mt-1">{typeIcon(n.type)}</div>
                <div className="flex-1">
                  <p className="text-sm mb-1">{n.message}</p>
                  {n.createdAt && !isNaN(new Date(n.createdAt).getTime()) && (
                    <p className="text-xs text-gray-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  )}
                  {linkTo && (
                    <Link
                      href={linkTo}
                      className="text-blue-400 text-sm hover:underline mt-2 inline-block"
                    >
                      {linkTo.startsWith('/chats') ? 'Перейти в чат →' : 'Перейти →'}
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
