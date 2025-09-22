'use client'

import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen flex bg-black text-gray-100">
        {/* Сайдбар */}
        <aside className="w-64 border-r border-gray-800 p-4">
          <h1 className="text-xl font-bold mb-4">Админ-панель</h1>
          <nav className="space-y-2 text-sm">
            <Link className="block hover:text-white" href="/admin">Главная</Link>
            <Link className="block hover:text-white" href="/admin/users">Пользователи</Link>
            <Link className="block hover:text-white" href="/admin/tasks">Задачи</Link>
            <Link className="block hover:text-white" href="/admin/cert">Сертификация</Link>
            <Link className="block hover:text-white" href="/admin/reviews">Отзывы</Link>
            <Link className="block hover:text-white" href="/admin/responses">Отклики</Link>
          </nav>
        </aside>

        {/* Контент */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </AdminGuard>
  )
}
