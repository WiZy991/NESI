'use client'

import { useUser } from '@/context/UserContext'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, ClipboardList } from 'lucide-react'
import TaskSkeleton from '@/components/TaskSkeleton'
import EmptyState from '@/components/EmptyState'
import FavoriteTaskButton from '@/components/FavoriteTaskButton'
import { Link as LinkIcon, AlertTriangle } from 'lucide-react'
import { copyToClipboard, getTaskUrl } from '@/lib/copyToClipboard'
import { toast } from 'sonner'

type Task = {
  id: string
  title: string
  description: string
  price: string | null
  deadline: string | null
  status: string
  createdAt: string
  favoritedAt: string
  customer: {
    id: string
    fullName: string | null
    email: string
    avgRating: number
  }
  subcategory: {
    id: string
    name: string
    category: {
      id: string
      name: string
    }
  } | null
  _count: {
    responses: number
  }
}

export default function FavoritesPage() {
  const { token, user } = useUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!token || user?.role !== 'executor') {
      setLoading(false)
      setTasks([])
      return
    }

    fetchFavorites()
  }, [token, user?.role, page])

  const fetchFavorites = async () => {
    if (!token || user?.role !== 'executor') return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/favorites?page=${page}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Ошибка загрузки избранных задач')
      }

      const data = await res.json()
      setTasks(data.tasks || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки избранных задач')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = (taskId: string) => {
    // Оптимистичное обновление - удаляем задачу из списка сразу
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">Войдите, чтобы просматривать избранные задачи</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            Войти
          </Link>
        </div>
      </div>
    )
  }

  if (user.role !== 'executor') {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-gray-300">
        <div className="py-16 border border-emerald-500/20 rounded-2xl bg-black/40">
          <p className="text-lg font-semibold text-emerald-300">Избранные задачи доступны только исполнителям.</p>
          <p className="mt-3 text-gray-400">Вы можете просматривать каталог задач или управлять своими заказами.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/tasks" className="px-4 py-2 rounded-lg border border-emerald-400 text-emerald-300 hover:bg-emerald-400/10 transition-colors">
              Каталог задач
            </Link>
            <Link href="/my-tasks" className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-600/20 transition-colors">
              Мои задачи
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-emerald-400 mb-2">
          <Heart className="w-8 h-8 fill-red-500 text-red-500" />
          Избранные задачи
        </h1>
        <p className="text-gray-400">
          Задачи, которые вы сохранили для просмотра позже
        </p>
      </div>

      {/* Список задач */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchFavorites}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Нет избранных задач"
          description="Добавьте задачи в избранное, чтобы быстро находить их позже"
          actionLabel="Найти задачи"
          actionHref="/tasks"
        />
      ) : (
        <>
          <div className="space-y-4 sm:space-y-6">
            {tasks.map(task => (
              <div
                key={task.id}
                className="group relative p-5 sm:p-6 border border-emerald-500/30 rounded-2xl bg-gradient-to-br from-black/60 via-slate-900/40 to-black/60 backdrop-blur-sm shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] hover:border-emerald-400/60 transition-all duration-300 hover:-translate-y-1 space-y-4 overflow-hidden"
              >
                {/* Декоративный градиент при наведении */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>

                {/* Кнопки действий */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
                  {/* Кнопка закладки */}
                  <FavoriteTaskButton
                    taskId={task.id}
                    size="sm"
                    className="p-2 hover:bg-emerald-500/20 rounded-lg"
                  />
                  {/* Кнопка копирования ссылки */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const url = getTaskUrl(task.id)
                      const success = await copyToClipboard(url)
                      if (success) {
                        toast.success('Ссылка скопирована')
                      } else {
                        toast.error('Не удалось скопировать ссылку')
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all group-hover:scale-110"
                    title="Копировать ссылку на задачу"
                    aria-label="Копировать ссылку"
                  >
                    <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Категория */}
                {task.subcategory && (
                  <div className="flex flex-wrap items-center gap-2 pr-12">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600/20 to-emerald-600/10 border border-emerald-500/40 rounded-lg text-xs sm:text-sm font-medium text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] backdrop-blur-sm">
                      <span className="text-base">🏷️</span>
                      {task.subcategory.category.name}
                    </span>
                    <span className="text-emerald-500 text-sm">→</span>
                    <span className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-blue-600/10 border border-blue-500/40 rounded-lg text-xs font-medium text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      {task.subcategory.name}
                    </span>
                  </div>
                )}

                {/* Заголовок */}
                <Link href={`/tasks/${task.id}`}>
                  <h2 className="text-lg sm:text-xl font-bold text-emerald-200 group-hover:text-emerald-100 cursor-pointer line-clamp-2 pr-10 transition-colors duration-200">
                    {task.title}
                  </h2>
                </Link>

                {/* Описание */}
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed line-clamp-3">
                  {task.description}
                </p>

                {/* Цена и информация */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gradient-to-r from-transparent via-emerald-500/30 to-transparent">
                  {task.price && (
                    <p className="text-emerald-400 font-bold text-lg sm:text-xl flex items-center gap-2 bg-gradient-to-r from-emerald-600/20 to-transparent px-4 py-2 rounded-lg border border-emerald-500/30">
                      <span className="text-xl">💰</span>
                      <span className="tracking-wide">{task.price} ₽</span>
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-gray-400">
                    <p className="flex items-center gap-2">
                      <span className="text-gray-500">👤</span>
                      <span>{task.customer?.fullName || 'Без имени'}</span>
                    </p>
                    <span className="hidden sm:inline text-gray-600">•</span>
                    <p className="flex items-center gap-2">
                      <span className="text-gray-500">📅</span>
                      <span>Добавлено: {new Date(task.favoritedAt).toLocaleDateString('ru-RU')}</span>
                    </p>
                    {task._count.responses > 0 && (
                      <>
                        <span className="hidden sm:inline text-gray-600">•</span>
                        <p className="flex items-center gap-2">
                          <span className="text-gray-500">💬</span>
                          <span>{task._count.responses} откликов</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-6 sm:mt-8">
              <nav aria-label="Пагинация избранных задач">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
                  aria-label="Предыдущая страница"
                >
                  ← Назад
                </button>
                <span className="text-gray-400 text-sm sm:text-base" aria-label={`Страница ${page} из ${totalPages}`}>
                  Страница {page} из {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
                  aria-label="Следующая страница"
                >
                  Далее →
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  )
}

