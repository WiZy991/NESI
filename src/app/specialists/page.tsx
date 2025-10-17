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
  badges: Array<{ badge: { id: string; name: string; icon: string } }>
  _count?: { reviewsReceived?: number }
  reviewsCount?: number
}

type ApiResponse = {
  items: SpecialistItem[]
  total: number
  page: number
  pages: number
  take: number
}

type MyLevel = {
  level: number
  xp: number
  nextLevelXP: number | null
  xpToNextLevel: number
  progressPercent: number
}

const BOUNDS = [0, 100, 300, 600, 1000, 1500, 2100]
function levelFromXp(xpRaw: number) {
  const xp = Math.max(0, xpRaw ?? 0)
  let lvl = 0
  for (let i = 0; i < BOUNDS.length; i++) {
    if (xp >= BOUNDS[i]) lvl = i
    else break
  }
  const prev = BOUNDS[lvl] ?? 0
  const next = BOUNDS[lvl + 1] ?? prev + 400
  const progress = Math.min(100, Math.round(((xp - prev) / Math.max(1, next - prev)) * 100))
  const toNext = Math.max(0, next - xp)
  return { lvl, progress, toNext }
}

export default function SpecialistsPage() {
  const { user } = useUser()

  // Фильтры
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [skill, setSkill] = useState('')
  const [minXp, setMinXp] = useState('')
  const [minRating, setMinRating] = useState('')

  // Категории подиума
  const [category, setCategory] = useState<string>('all')
  const categories = [
    { key: 'all', label: 'Все' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'backend', label: 'Backend' },
    { key: 'python', label: 'Python' },
    { key: 'design', label: 'Design' },
    { key: 'marketing', label: 'Маркетинг' },
    { key: 'bitrix', label: 'Bitrix' },
  ]

  // Пагинация
  const [page, setPage] = useState(1)
  const take = 12

  const [items, setItems] = useState<SpecialistItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myLevel, setMyLevel] = useState<MyLevel | null>(null)

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (city.trim()) p.set('city', city.trim())
    if (skill.trim()) p.set('skill', skill.trim())
    if (category !== 'all') p.set('category', category)
    if (minXp.trim()) p.set('minXp', String(parseInt(minXp, 10) || 0))
    if (minRating.trim()) p.set('minRating', String(parseFloat(minRating) || 0))
    p.set('page', String(page))
    p.set('take', String(take))
    return p.toString()
  }, [q, city, skill, minXp, minRating, page, category])

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Загрузка списка
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      ;(async () => {
        setLoading(true)
        setError(null)
        try {
          const res = await fetch(`/api/specialists?${queryString}`, { cache: 'no-store', signal: ctrl.signal })
          const data: ApiResponse = await res.json()
          if (!res.ok) throw new Error((data as any)?.error || `${res.status} ${res.statusText}`)
          setItems(data.items || [])
          setTotal(data.total || 0)
          setPages(data.pages || 1)
        } catch (e: any) {
          if (e?.name === 'AbortError') return
          setError(e?.message || 'Ошибка загрузки исполнителей')
          setItems([])
          setTotal(0)
          setPages(1)
        } finally {
          setLoading(false)
        }
      })()
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [queryString])

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setPage(1)
  }, [q, city, skill, minXp, minRating, category])

  // Уровень текущего пользователя
  useEffect(() => {
    let cancelled = false
    if (!user?.id) {
      setMyLevel(null)
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/users/me/level', { cache: 'no-store' })
        if (!res.ok) return
        const data: MyLevel = await res.json()
        if (!cancelled) setMyLevel(data)
      } catch {
        if (!cancelled) setMyLevel(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const spring = {
    type: 'spring',
    stiffness: 220,
    damping: 22,
    mass: 0.9,
  }

  // Плавный скролл вверх
  const listTopRef = useRef<HTMLDivElement | null>(null)
  const scrollToListTop = () => {
    const y = (listTopRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 80
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  const Card = (u: SpecialistItem) => {
    const name = u.fullName || u.email || 'Без имени'
    const letter = (name[0] || '•').toUpperCase()
    let xpValue = (u.xpComputed ?? u.xp ?? 0) || 0
    let lvl = u.lvl
    let progress = u.progress
    let toNext = u.toNext

    if (user?.id && user.id === u.id && myLevel) {
      xpValue = myLevel.xp
      lvl = myLevel.level
      progress = myLevel.progressPercent
      toNext = myLevel.xpToNextLevel
    }

    if (lvl == null || progress == null || toNext == null) {
      const calc = levelFromXp(xpValue)
      lvl = calc.lvl
      progress = calc.progress
      toNext = calc.toNext
    }

    const reviews = u.reviewsCount ?? u._count?.reviewsReceived ?? 0
    const skillsStr = Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || '')

    return (
      <motion.div
        layout
        whileHover={{
          scale: 1.05,
          y: -6,
          boxShadow: '0 0 40px rgba(16,185,129,0.35)',
        }}
        transition={spring}
      >
        <Link
          href={`/users/${u.id}`}
          className="block bg-black/50 backdrop-blur-md text-white p-4 rounded-2xl border border-emerald-700/30 hover:border-emerald-500/50 transition cursor-pointer"
        >
          {u.avatarUrl ? (
            <motion.img
              src={u.avatarUrl}
              alt={name}
              className="w-12 h-12 rounded-full mb-2 object-cover"
              layout="position"
              transition={spring}
            />
          ) : (
            <motion.div
              layout="position"
              className="w-12 h-12 rounded-full bg-gray-700 mb-2 flex items-center justify-center text-base font-bold"
            >
              {letter}
            </motion.div>
          )}

          <motion.h3 layout="position" className="text-lg font-semibold leading-tight">{name}</motion.h3>
          <p className="text-xs text-gray-300 mb-3">{u.location || 'Без города'}</p>

          <div className="flex items-center justify-between text-xs mb-1">
            <span>Уровень: <span className="font-semibold text-white">{lvl}</span></span>
            <span className="opacity-70">{xpValue} XP</span>
          </div>

          <div className="h-2 rounded bg-emerald-950/60 overflow-hidden mb-1">
            <motion.div
              className="h-full bg-emerald-500"
              animate={{ width: `${progress}%` }}
              transition={{ ...spring, duration: 0.6 }}
            />
          </div>

          <div className="text-[11px] text-gray-400 mb-3">
            До следующего уровня: {toNext && toNext > 0 ? `${toNext} XP` : '—'}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-gray-200">
            <div className="rounded bg-emerald-950/50 p-2 text-center border border-emerald-800/40">
              <div className="text-white font-semibold">{u.completedTasksCount ?? 0}</div>
              <div className="opacity-70">Задачи</div>
            </div>
            <div className="rounded bg-emerald-950/50 p-2 text-center border border-emerald-800/40">
              <div className="text-white font-semibold">{(u.avgRating ?? 0).toFixed(1)}</div>
              <div className="opacity-70">Рейтинг</div>
            </div>
            <div className="rounded bg-emerald-950/50 p-2 text-center border border-emerald-800/40">
              <div className="text-white font-semibold">{reviews}</div>
              <div className="opacity-70">Отзывы</div>
            </div>
          </div>

          {skillsStr && <p className="text-[11px] mt-2 text-gray-400 line-clamp-2">Навыки: {skillsStr}</p>}
        </Link>
      </motion.div>
    )
  }

  // Страницы
  const getPageNumbers = () => {
    const spread = 2
    const start = Math.max(1, page - spread)
    const end = Math.min(pages, page + spread)
    const arr: number[] = []
    for (let p = start; p <= end; p++) arr.push(p)
    return arr
  }

  const changePage = (p: number) => {
    if (p === page || p < 1 || p > pages) return
    setPage(p)
    scrollToListTop()
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-black/40 backdrop-blur-sm border border-emerald-800/40 rounded-xl p-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Поиск</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="имя или почта"
            className="w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Город</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="например: Москва"
            className="w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Навык</label>
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="точно из списка навыков"
            className="w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Мин. XP</label>
          <input
            value={minXp}
            onChange={(e) => setMinXp(e.target.value)}
            placeholder="например: 50"
            className="w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Мин. рейтинг</label>
          <input
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            placeholder="например: 4.0"
            className="w-full rounded bg-black/60 text-white px-3 py-2 outline-none border border-emerald-800/50 focus:border-emerald-500"
          />
        </div>
      </div>

      {loading && <div className="text-gray-300">Загрузка…</div>}
      {error && <div className="text-red-400">{error}</div>}

      <div ref={listTopRef} />

      {!loading && !error && items.length === 0 && (
        <div className="text-gray-400">Исполнителей по текущим фильтрам не найдено</div>
      )}

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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {items.map((u) => (
                <Card key={u.id} {...u} />
              ))}
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
      )}

      {/* Пагинация */}
      {!loading && pages > 1 && (
        <motion.div
          layout
          transition={spring}
          className="mt-8 flex flex-wrap items-center justify-center gap-2 text-white"
        >
          <button
            className="px-3 py-1 rounded-lg border border-emerald-700/40 text-sm disabled:opacity-40 hover:border-emerald-500/60 transition"
            disabled={page <= 1}
            onClick={() => changePage(page - 1)}
          >
            ← Назад
          </button>

          {getPageNumbers().map((p) => (
            <button
              key={p}
              onClick={() => changePage(p)}
              className={`px-3 py-1 rounded-lg border text-sm transition ${
                p === page
                  ? 'border-emerald-500 bg-emerald-600/20 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                  : 'border-emer
ald-700/40 hover:border-emerald-500/60'
}`}
>
{p}
</button>
))}      
          <button
        className="px-3 py-1 rounded-lg border border-emerald-700/40 text-sm disabled:opacity-40 hover:border-emerald-500/60 transition"
        disabled={page >= pages}
        onClick={() => changePage(page + 1)}
      >
        Вперёд →
      </button>
    </motion.div>
  )}
</div>
    )
}
