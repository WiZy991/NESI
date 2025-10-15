'use client'

import CategoryDropdown from '@/components/CategoryDropdown'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type Task = {
  id: string
  title: string
  description: string
  createdAt: string
  price?: number
  customer: { fullName?: string }
}

type Category = {
  id: string
  name: string
  subcategories: { id: string; name: string }[]
}

export default function TaskCatalogPage() {
  const { user, token, loading: userLoading } = useUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'new')
  const [subcategory, setSubcategory] = useState(searchParams.get('subcategory') || '')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (search) query.set('search', search)
      if (status) query.set('status', status)
      if (sort) query.set('sort', sort)
      if (subcategory) query.set('subcategory', subcategory)
      query.set('page', page.toString())
      query.set('limit', '20')

      const res = await fetch(`/api/tasks?${query.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')

      setTasks(data.tasks || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err: any) {
      console.error('Ошибка загрузки задач:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, status, sort, subcategory, token, page])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err)
    }
  }, [])

  useEffect(() => {
    if (!userLoading && user && token) {
      fetchTasks()
      fetchCategories()
    }
  }, [userLoading, user, token, fetchTasks, fetchCategories])

  const applyFilters = useCallback(() => {
    const query = new URLSearchParams()
    if (search) query.set('search', search)
    if (status) query.set('status', status)
    if (sort) query.set('sort', sort)
    if (subcategory) query.set('subcategory', subcategory)
    router.push(`/tasks?${query.toString()}`)
    setPage(1)
  }, [search, status, sort, subcategory, router])

  const resetFilters = useCallback(() => {
    setSearch('')
    setStatus('')
    setSort('new')
    setSubcategory('')
    setPage(1)
    router.push('/tasks')
  }, [router])

  const handleSubcategorySelect = useCallback(
    (id: string) => {
      setSubcategory(id)
      const query = new URLSearchParams(searchParams.toString())
      query.set('subcategory', id)
      router.push(`/tasks?${query.toString()}`)
    },
    [searchParams, router]
  )

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-6 border border-emerald-500/30 rounded-xl bg-black/40 animate-pulse shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-3"
        >
          <div className="h-5 bg-emerald-900/40 rounded w-1/2"></div>
          <div className="h-4 bg-emerald-900/30 rounded w-3/4"></div>
          <div className="h-3 bg-emerald-900/20 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="relative max-w-[95rem] mx-auto px-8 py-10 space-y-8">
      {/* Фон с мягким свечением */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_70%)]" />

      <h1 className="text-5xl font-bold text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
        Каталог задач
      </h1>

      <CategoryDropdown
        categories={categories}
        onSelectSubcategory={handleSubcategorySelect}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10">
        {/* Фильтры */}
        <aside className="bg-black/40 backdrop-blur-sm border border-emerald-500/30 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.25)] p-6 sticky top-28 h-fit">
          <input
            type="text"
            placeholder="🔍 Поиск..."
            className="w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Все статусы</option>
            <option value="open">Открыта</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Выполнена</option>
          </select>
          <select
            className="w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="new">Сначала новые</option>
            <option value="old">Сначала старые</option>
          </select>

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={applyFilters}
              className="w-full py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold"
            >
              Применить
            </button>
            <button
              onClick={resetFilters}
              className="w-full py-2 rounded-lg border border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white transition"
            >
              Сбросить
            </button>
          </div>
        </aside>

        {/* Задачи */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading || userLoading ? (
            renderSkeleton()
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : tasks.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400 text-lg">
              😔 Задач пока нет
            </div>
          ) : (
            <>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-6 border border-emerald-500/30 rounded-xl bg-gradient-to-br from-black/60 to-emerald-900/10 hover:from-black/80 hover:to-emerald-900/20 shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all duration-300 space-y-3 hover:scale-[1.02]"
                >
                  <Link href={`/tasks/${task.id}`}>
                    <h2 className="text-xl font-semibold text-emerald-300 hover:underline cursor-pointer">
                      {task.title}
                    </h2>
                  </Link>
                  <p className="text-gray-300 line-clamp-3">{task.description}</p>
                  {task.price && (
                    <p className="text-emerald-400 font-medium">💰 {task.price} ₽</p>
                  )}
                  <p className="text-sm text-gray-400">
                    Автор: {task.customer?.fullName || 'Без имени'} —{' '}
                    {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              ))}
            </>
          )}
        </section>
      </div>

      {/* Пагинация */}
      {tasks.length > 0 && (
        <div className="flex justify-center items-center gap-6 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 transition"
          >
            ← Назад
          </button>
          <span className="text-gray-400 text-lg">
            Страница {page} из {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black disabled:opacity-40 transition"
          >
            Далее →
          </button>
        </div>
      )}
    </div>
  )
}
