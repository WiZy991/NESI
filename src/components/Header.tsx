'use client'

import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function Header() {
  const { user, token, logout, unreadCount, setUnreadCount } = useUser()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const menuRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        notifRef.current && !notifRef.current.contains(e.target as Node)
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

  // 📭 Пометить все уведомления как прочитанные
  const markAllRead = async () => {
    if (!token) return
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setUnreadCount(0)
    } catch (err) {
      console.error('Ошибка при отметке уведомлений как прочитанных', err)
    }
  }

  const handleNotificationClick = async (notif: any) => {
    if (notif.link) {
      setNotifOpen(false)
      await markAllRead()
      router.push(notif.link)
    }
  }

  const handleGoToNotifications = async () => {
    setNotifOpen(false)
    await markAllRead()
    router.push('/notifications')
  }

  return (
    <header className="w-full px-8 py-4 flex justify-between items-center bg-black border-b border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.4)] relative">
      {/* Логотип */}
      <Link
        href="/"
        className="text-2xl font-bold text-emerald-400 tracking-widest hover:scale-105 transition"
      >
        NESI
      </Link>

      <nav className="flex gap-6 items-center relative text-gray-200">
        {user ? (
          <>
            {/* Уведомления */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex items-center gap-1 hover:text-emerald-400 transition"
              >
                <span className="text-lg">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Всплывающее окно уведомлений */}
              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-gray-900 border border-emerald-500/30 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] z-50 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-gray-400 text-sm p-4 text-center">
                        Нет новых уведомлений
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 border-b border-emerald-500/10 hover:bg-gray-800 transition ${
                            notif.link ? 'cursor-pointer hover:text-emerald-400' : ''
                          }`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <p className="text-sm text-gray-200">
                            {notif.message || 'Новое уведомление'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
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

            {/* Остальная навигация */}
            {user.role === 'admin' ? (
              <>
                <Link href="/admin" className="hover:text-emerald-400 transition">
                  Админ-панель
                </Link>
                <Link href="/profile" className="hover:text-emerald-400 transition">
                  Профиль
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 transition"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                {user.role === 'executor' && (
                  <>
                    <Link href="/specialists" className="hover:text-emerald-400 transition">
                      Подиум исполнителей
                    </Link>
                    <Link href="/tasks" className="hover:text-emerald-400 transition">
                      Каталог задач
                    </Link>
                    <Link href="/tasks/my" className="hover:text-emerald-400 transition">
                      Мои задачи
                    </Link>
                    <Link href="/responses/my" className="hover:text-emerald-400 transition">
                      Мои отклики
                    </Link>
                  </>
                )}
                {user.role === 'customer' && (
                  <>
                    <Link href="/specialists" className="hover:text-emerald-400 transition">
                      Подиум исполнителей
                    </Link>
                    <Link href="/tasks" className="hover:text-emerald-400 transition">
                      Каталог задач
                    </Link>
                    <Link href="/my-tasks" className="hover:text-emerald-400 transition">
                      Мои задачи
                    </Link>
                    <Link href="/tasks/new" className="hover:text-emerald-400 transition">
                      Создать задачу
                    </Link>
                  </>
                )}

                <Link href="/profile" className="hover:text-emerald-400 transition">
                  Профиль
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="hover:text-emerald-400 transition"
                  >
                    Ещё ▾
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                      <Link
                        href="/community"
                        className="block px-4 py-2 hover:bg-gray-700 transition"
                        onClick={() => setMenuOpen(false)}
                      >
                        💬 Сообщество
                      </Link>
                      <Link
                        href="/hire"
                        className="block px-4 py-2 hover:bg-gray-700 transition"
                        onClick={() => setMenuOpen(false)}
                      >
                        📑 Запросы найма
                      </Link>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 transition"
                >
                  Выйти
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="px-5 py-2 rounded-full border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition"
            >
              Вход
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-medium hover:brightness-110 transition"
            >
              Регистрация
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
