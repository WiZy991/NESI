'use client'

import { useEffect, useState, useMemo } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { Bell, CheckCircle2, Star, MessageSquare } from 'lucide-react'

interface Notification {
  id: string
  type: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

const typeIcon = (type: string) => {
  const base = 'w-5 h-5 drop-shadow-[0_0_6px_rgba(0,255,180,0.4)]'
  switch (type) {
    case 'task':
      return <Star className={`${base} text-yellow-400`} />
    case 'message':
      return <MessageSquare className={`${base} text-blue-400`} />
    case 'system':
      return <CheckCircle2 className={`${base} text-green-400`} />
    default:
      return <Bell className={`${base} text-gray-400`} />
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isToday =
    date.toDateString() === today.toDateString()
  const isYesterday =
    date.toDateString() === yesterday.toDateString()

  if (isToday) return 'Сегодня'
  if (isYesterday) return 'Вчера'

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
  })
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

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {}
    notifications.forEach((n) => {
      const label = formatDate(n.createdAt)
      if (!groups[label]) groups[label] = []
      groups[label].push(n)
    })
    return groups
  }, [notifications])

  if (loading)
    return (
      <p className="p-6 text-gray-400 animate-pulse text-center">
        Загрузка уведомлений...
      </p>
    )

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2 text-emerald-400 drop-shadow-[0_0_8px_rgba(0,255,180,0.3)]">
        <Bell className="text-emerald-400 w-7 h-7" /> Уведомления
      </h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center text-gray-500 py-16 animate-fade-in">
          <Bell className="w-10 h-10 mb-3 text-gray-600" />
          <p className="text-lg">Пока уведомлений нет</p>
          <p className="text-sm text-gray-600 mt-1">
            Всё спокойно — значит, день удался ☕
          </p>
        </div>
      ) : (
        Object.entries(groupedNotifications).map(([dateLabel, items]) => (
          <div key={dateLabel} className="mb-8">
            <h2 className="text-lg font-semibold text-emerald-300 mb-3 border-b border-emerald-800 pb-1">
              {dateLabel}
            </h2>
            <ul className="space-y-4">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`group p-4 rounded-xl flex items-start gap-4 shadow-lg transition-all duration-300
                    ${
                      n.isRead
                        ? 'bg-gradient-to-br from-[#0b0b0b]/70 to-[#0f0f0f]/90 border border-gray-800 text-gray-300'
                        : 'bg-gradient-to-br from-[#001b1b]/80 to-[#002a2a]/90 border border-emerald-500/40 text-white shadow-[0_0_15px_rgba(0,255,180,0.25)]'
                    }
                    hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,255,180,0.35)]`}
                >
                  <div className="mt-1 transition-transform group-hover:rotate-6">
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm mb-1">{n.message}</p>
                    <p className="text-xs text-gray-500 mb-1">
                      {new Date(n.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-emerald-400 text-sm font-medium hover:underline hover:text-emerald-300 transition-colors"
                      >
                        Подробнее →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
