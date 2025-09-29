'use client'

import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function Header() {
  const { user, logout, unreadCount } = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Закрывать меню при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="w-full px-8 py-4 flex justify-between items-center bg-black border-b border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
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
            {user.role === 'admin' ? (
              <>
                <Link href="/admin" className="hover:text-emerald-400 transition">
                  Админ-панель
                </Link>
                <Link
                  href="/notifications"
                  className="relative flex items-center gap-1 hover:text-emerald-400 transition"
                >
                  Уведомления <span className="text-lg">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
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
                {/* 👤 Пользователи */}
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

                <Link
                  href="/notifications"
                  className="relative flex items-center gap-1 hover:text-emerald-400 transition"
                >
                  Уведомления <span className="text-lg">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link href="/profile" className="hover:text-emerald-400 transition">
                  Профиль
                </Link>

                {/* Ещё с кликом */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setOpen((v) => !v)}
                    className="hover:text-emerald-400 transition"
                  >
                    Ещё ▾
                  </button>
                  {open && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                      <Link
                        href="/community"
                        className="block px-4 py-2 hover:bg-gray-700 transition"
                        onClick={() => setOpen(false)}
                      >
                        💬 Сообщество
                      </Link>
                      <Link
                        href="/hire"
                        className="block px-4 py-2 hover:bg-gray-700 transition"
                        onClick={() => setOpen(false)}
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
