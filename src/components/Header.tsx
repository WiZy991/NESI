'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function Header() {
  const { user, token, logout, unreadCount, setUnreadCount } = useUser()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [sseConnected, setSseConnected] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // ================== UI улучшения ===================
  const linkClass =
    'relative font-[500] text-[15px] tracking-wide transition-all duration-200 px-2 py-1 hover:text-emerald-400 hover:drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]'

  // ===================================================

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Загрузка уведомлений
  useEffect(() => {
    if (!user || !token) return
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) {
          setNotifications(data.notifications || [])
        } else {
          console.error('Ошибка уведомлений:', data)
          setNotifications([])
        }
      } catch (err) {
        console.error('Ошибка уведомлений:', err)
      }
    }
    fetchNotifications()
  }, [user, token])

  // SSE и непрочитанные
  useEffect(() => {
    if (!user || !token) return

    const fetchUnreadMessages = async () => {
      try {
        const res = await fetch('/api/chats/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) setUnreadMessagesCount(data.unreadCount || 0)
      } catch (err) {
        console.error('Ошибка получения непрочитанных:', err)
      }
    }

    const connectSSE = () => {
      if (eventSourceRef.current) eventSourceRef.current.close()

      const eventSource = new EventSource(
        `/api/notifications/stream?token=${encodeURIComponent(token)}`
      )

      eventSource.onopen = () => setSseConnected(true)

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'message') {
            fetchUnreadMessages()
          }
        } catch {}
      }

      eventSource.onerror = () => {
        setSseConnected(false)
        setTimeout(connectSSE, 5000)
      }

      eventSourceRef.current = eventSource
    }

    fetchUnreadMessages()
    connectSSE()

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [user, token])

  const markAllRead = async () => {
    if (!token) return
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setUnreadCount(0)
    } catch (err) {
      console.error('Ошибка при отметке уведомлений:', err)
    }
  }

  const handleGoToNotifications = async () => {
    setNotifOpen(false)
    await markAllRead()
    router.push('/notifications')
  }

  return (
    <header className="w-full px-8 py-4 flex justify-between items-center bg-black border-b border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] relative font-[Poppins]">
      <Link
        href="/"
        className="text-2xl font-bold text-emerald-400 tracking-wider hover:scale-105 hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-200"
      >
        NESI
      </Link>

      <nav className="flex gap-7 items-center text-gray-200">
        {user ? (
          <>
            {/* 🔔 Уведомления */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                className={`${linkClass} text-lg flex items-center gap-1`}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
                {sseConnected && (
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-gray-900 border border-emerald-500/30 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] z-50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        <div className="text-2xl mb-2">🔔</div>
                        <p>Нет новых уведомлений</p>
                      </div>
                    ) : (
                      notifications.map((notif, index) => (
                        <div
                          key={index}
                          className="p-3 border-b border-gray-700 hover:bg-gray-800 transition cursor-pointer"
                          onClick={handleGoToNotifications}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {notif.sender?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-medium truncate">
                                {notif.title}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                <strong>{notif.sender}:</strong> {notif.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-emerald-500/20 bg-black/40 text-center">
                    <button
                      onClick={handleGoToNotifications}
                      className="text-emerald-400 hover:underline text-sm font-medium"
                    >
                      Перейти к уведомлениям →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 🧭 Навигация */}
            <Link href="/specialists" className={linkClass}>
              Подиум исполнителей
            </Link>
            <Link href="/tasks" className={linkClass}>
              Каталог задач
            </Link>
            <Link href="/tasks/my" className={linkClass}>
              Мои задачи
            </Link>
            <Link href="/responses/my" className={linkClass}>
              Мои отклики
            </Link>
            <Link href="/profile" className={linkClass}>
              Профиль
            </Link>

            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(v => !v)} className={linkClass}>
                Ещё ▾
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] z-50">
                  <Link
                    href="/chats"
                    className="block px-4 py-2 hover:bg-gray-700 transition relative"
                    onClick={() => setMenuOpen(false)}
                  >
                    💬 Чаты
                    {unreadMessagesCount > 0 && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/community"
                    className="block px-4 py-2 hover:bg-gray-700 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    🏘️ Сообщество
                  </Link>
                  <Link
                    href="/hire"
                    className="block px-4 py-2 hover:bg-gray-700 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    📑 Запросы найма
                  </Link>

                  <div className="border-t border-gray-700 mt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        handleLogout()
                      }}
                      className="block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 transition"
                    >
                      🚪 Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="px-5 py-2 rounded-full border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-[500]"
            >
              Вход
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-semibold hover:brightness-110 transition"
            >
              Регистрация
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
