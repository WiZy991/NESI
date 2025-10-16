'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  Star,
  MessageSquare,
  UserCheck,
  Heart,
  MessageCircle,
  ClipboardCheck,
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  message: string
  link?: string
  relatedId?: string
  userId?: string
  isRead: boolean
  createdAt: string
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'task':
      return <ClipboardCheck className="w-5 h-5 text-emerald-400" />
    case 'message':
      return <MessageSquare className="w-5 h-5 text-blue-400" />
    case 'like':
      return <Heart className="w-5 h-5 text-pink-500" />
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-amber-400" />
    case 'assign':
      return <UserCheck className="w-5 h-5 text-purple-400" />
    case 'system':
      return <CheckCircle2 className="w-5 h-5 text-green-400" />
    default:
      return <Bell className="w-5 h-5 text-gray-400" />
  }
}

// Группировка уведомлений по дате
const groupByDate = (notifications: Notification[]) => {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  const groups: Record<string, Notification[]> = {}

  notifications.forEach(n => {
    const date = new Date(n.createdAt).toDateString()
    let label = date === today ? 'Сегодня' : date === yesterday ? 'Вчера' : 'Ранее'
    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  })

  return groups
}

// Определяем ссылку назначения по типу уведомления
const getLinkByType = (n: Notification) => {
  if (n.type === 'message') {
    return n.userId ? `/chats?open=${n.userId}` : '/chats'
  }
  if (n.type === 'task') {
    return n.relatedId ? `/tasks/${n.relatedId}` : '/tasks'
  }
  if (n.type === 'assign') {
    return n.relatedId ? `/tasks/${n.relatedId}` : '/tasks'
  }
  if (n.type === 'like' || n.type === 'comment' || n.type === 'reply') {
    return n.relatedId ? `/community/${n.relatedId}` : '/community'
  }
  if (n.type === 'system') {
    return '/notifications'
  }
  return '/profile'
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

        // Отмечаем как прочитанные
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

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-emerald-400 text-lg">
        ⏳ Загружаем уведомления...
      </div>
    )

  if (notifications.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-400">
        <Bell className="w-10 h-10 mb-3 text-gray-500" />
        <p className="text-lg font-medium">Уведомлений пока нет</p>
        <p className="text-sm text-gray-500 mt-1">
          Всё спокойно — никто ничего не пишет 😌
        </p>
      </div>
    )

  const grouped = groupByDate(notifications)

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
        🔔 Уведомления
      </h1>

      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-1">
            {label}
          </h2>
          <ul className="space-y-3">
            {items.map(n => {
              const link = getLinkByType(n)
              const formattedDate =
                n.createdAt && !isNaN(new Date(n.createdAt).getTime())
                  ? new Date(n.createdAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''

              return (
                <li
                  key={n.id}
                  className={`p-4 rounded-xl flex items-start gap-4 transition-all duration-200 hover:scale-[1.01] ${
                    n.isRead
                      ? 'bg-gray-800/40 border border-gray-700 text-gray-400'
                      : 'bg-gray-800/80 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-white'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">{typeIcon(n.type)}</div>
                  <div className="flex-1">
                    <p className="text-sm mb-1 leading-snug">{n.message}</p>
                    {formattedDate && (
                      <p className="text-xs text-gray-500">{formattedDate}</p>
                    )}
                    <Link
                      href={link}
                      className="text-emerald-400 text-sm hover:underline mt-2 inline-block"
                    >
                      {n.type === 'message'
                        ? 'Открыть чат →'
                        : n.type === 'task' || n.type === 'assign'
                        ? 'Перейти к задаче →'
                        : n.type === 'like' || n.type === 'comment'
                        ? 'Посмотреть в сообществе →'
                        : 'Подробнее →'}
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
