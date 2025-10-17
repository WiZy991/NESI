'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'

type SpecialistItem = {
  id: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  location: string | null
  skills: string[] | null
  xp: number | null
  xpComputed?: number | null
  lvl?: number
  progress?: number
  toNext?: number
  completedTasksCount: number | null
  avgRating: number | null
  reviewsCount?: number
  badges: Array<{ badge: { id: string; name: string; icon: string } }>
}

type ApiResponse = {
  items: SpecialistItem[]
  total: number
  page: number
  pages: number
  take: number
}

export default function SpecialistsPage() {
  const { user } = useUser()

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [skill, setSkill] = useState('')
  const [minXp, setMinXp] = useState('')
  const [minRating, setMinRating] = useState('')
  const [category, setCategory] = useState<string>('all') // 💡 активная категория
  const [page, setPage] = useState(1)
  const take = 12

  const [items, setItems] = useState<SpecialistItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categories = [
    { key: 'all', label: 'Все' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'backend', label: 'Backend' },
    { key: 'python', label: 'Python' },
    { key: 'design', label: 'Design' },
    { key: 'marketing', label: 'Маркетинг' },
    { key: 'bitrix', label: 'Bitrix' },
  ]

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (city.trim()) p.set('city', city.trim())
    if (skill.trim()) p.set('skill', skill.trim())
    if (category !== 'all') p.set('category', category)
    if (minXp.trim()) p.set('minXp', minXp)
    if (minRating.trim()) p.set('minRating', minRating)
    p.set('page', String(page))
    p.set('take', String(take))
    return p.toString()
  }, [q, city, skill, minXp, minRating, page, category])

  // ── запрос данных
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`/api/specialists?${queryString}`, { cache: 'no-store', signal: ctrl.signal })
      .then(async (r) => {
        const data: ApiResponse = await r.json()
        if (!r.ok) throw new Error(data?.error || `${r.status}`)
        setItems(data.items)
        setTotal(data.total)
        setPages(data.pages)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [queryString])

  const spring = { type: 'spring', stiffness: 220, damping: 24, mass: 0.9 }

  const Card = (u: SpecialistItem) => {
    const name = u.fullName || u.email || 'Без имени'
    const letter = (name[0] || '•').toUpperCase()

    return (
      <motion.div
        layout
        whileHover={{
          scale: 1.04,
          y: -6,
          boxShadow: '0 0 25px rgba(16,185,129,0.3)',
        }}
        transition={spring}
      >
        <Link
          href={`/users/${u.id}`}
          className="block bg-black/50 backdrop-blur-md text-white p-4 rounded-2xl border border-emerald-700/30 hover:border-emerald-500/50 transition cursor-pointer"
        >
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt={name} className="w-12 h-12 rounded-full mb-2 object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-700 mb-2 flex items-center justify-center text-base font-bold">
              {letter}
            </div>
          )}
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-xs text-gray-300 mb-3">{u.location || 'Без города'}</p>

          <div className="flex items-center justify-between text-xs mb-1">
            <span>Уровень: <b>{u.lvl}</b></span>
            <span className="opacity-70">{u.xpComputed ?? u.xp ?? 0} XP</span>
          </div>
          <div className="h-2 bg-emerald-950/60 rounded overflow-hidden mb-1">
            <motion.div
              className="h-full bg-emerald-500"
              animate={{ width: `${u.progress ?? 0}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mb-2">
            До след. уровня: {u.toNext && u.toNext > 0 ? `${u.toNext} XP` : '—'}
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs text-gray-200">
            <div className="bg-emerald-950/50 border border-emerald-800/40 rounded p-2 text-center">
              <b>{u.completedTasksCount ?? 0}</b><div className="opacity-70">Задачи</div>
            </div>
            <div className="bg-emerald-950/50 border border-emerald-800/40 rounded p-2 text-center">
              <b>{(u.avgRating ?? 0).toFixed(1)}</b><div className="opacity-70">Рейтинг</div>
            </div>
            <div className="bg-emerald-950/50 border border-emerald-800/40 rounded p-2 text-center">
              <b>{u.reviewsCount ?? 0}</b><div className="opacity-70">Отзывы</div>
            </div>
          </div>

          {u.skills && (
            <p className="text-[11px] mt-2 text-gray-400 line-clamp-2">
              Навыки: {u.skills.join(', ')}
            </p>
          )}
        </Link>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h2 className="text-xl font-bold mb-4 text-white">⚡ Подиум исполнителей</h2>

      {/* Категории */}
      <motion.div layout className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <motion.button
            key={c.key}
            layout
            onClick={() => {
              setCategory(c.key)
              setPage(1)
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              category === c.key
                ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'bg-emerald-900/20 text-emerald-300 hover:bg-emerald-800/30'
            }`}
          >
            {c.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-black/40 backdrop-blur-sm border border-emerald-800/40 rounded-xl p-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Поиск</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="имя или почта"
            className="w-full rounded bg-black/60 text-white px-3 py-2 border border-emerald-800/50 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Город</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="например: Москва"
            className="w-full rounded bg-black/60 text-white px-3 py-2 border border-emerald-800/50 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Навык</label>
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="точно из списка навыков"
            className="w-full rounded bg-black/60 text-white px-3 py-2 border border-emerald-800/50 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Мин. XP</label>
          <input
            value={minXp}
            onChange={(e) => setMinXp(e.target.value)}
            placeholder="50"
            className="w-full rounded bg-black/60 text-white px-3 py-2 border border-emerald-800/50 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Мин. рейтинг</label>
          <input
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            placeholder="4.0"
            className="w-full rounded bg-black/60 text-white px-3 py-2 border border-emerald-800/50 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {loading && <div className="text-gray-300">Загрузка…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && items.length > 0 && (
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`cat-${category}-page-${page}`}
              layout
              transition={spring}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {items.map((u) => (
                <Card key={u.id} {...u} />
              ))}
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-gray-400 text-center py-6">Нет исполнителей по выбранным фильтрам</div>
      )}
    </div>
  )
}
