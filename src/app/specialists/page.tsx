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

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [skill, setSkill] = useState('')
  const [minXp, setMinXp] = useState('')
  const [minRating, setMinRating] = useState('')
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
    if (minXp.trim()) p.set('minXp', String(parseInt(minXp, 10) || 0))
    if (minRating.trim()) p.set('minRating', String(parseFloat(minRating) || 0))
    p.set('page', String(page))
    p.set('take', String(take))
    return p.toString()
  }, [q, city, skill, minXp, minRating, page])

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          let specialists = data.items || []

          // === Умная сортировка по “ценности” исполнителя ===
          specialists.sort((a, b) => {
            const aXP = a.xpComputed ?? a.xp ?? 0
            const bXP = b.xpComputed ?? b.xp ?? 0
            const aL = levelFromXp(aXP)
            const bL = levelFromXp(bXP)

            const weightA =
              aL.lvl * 1000 +
              aL.progress * 3 +
              (a.avgRating ?? 0) * 20 +
              (a.reviewsCount ?? a._count?.reviewsReceived ?? 0) * 1.5 +
              (a.completedTasksCount ?? 0) * 0.5

            const weightB =
              bL.lvl * 1000 +
              bL.progress * 3 +
              (b.avgRating ?? 0) * 20 +
              (b.reviewsCount ?? b._count?.reviewsReceived ?? 0) * 1.5 +
              (b.completedTasksCount ?? 0) * 0.5

            return weightB - weightA
          })

          setItems(specialists)
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
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [queryString])

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
    bounce: 0.25,
  }

  const Card = (u: SpecialistItem) => {
    const name = u.fullName || u.email || 'Без имени'
    const letter = (name[0] || '•').toUpperCase()
    let xpValue = (u.xpComputed ?? u.xp ?? 0) || 0
    let lvl = u.lvl
    let progress = u.progress
    let toNext = u.toNext

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
              layout
              transition={spring}
            />
          ) : (
            <motion.div
              layout
              className="w-12 h-12 rounded-full bg-gray-700 mb-2 flex items-center justify-center text-base font-bold"
            >
              {letter}
            </motion.div>
          )}

          <motion.h3 layout className="text-lg font-semibold leading-tight">{name}</motion.h3>
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h2 className="text-xl font-bold mb-4 text-white">⚡ Подиум исполнителей</h2>

      {loading && <div className="text-gray-300">Загрузка…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && (
        <LayoutGroup>
          <AnimatePresence>
            <motion.div layout transition={spring} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {items.slice(0, 3).map((u, i) => (
                <motion.div
                  key={u.id}
                  layout
                  transition={spring}
                  whileHover={{ scale: 1.07, y: -8 }}
                  className={`relative ${i === 0 ? 'scale-105' : 'opacity-90'}`}
                >
                  <Card {...u} />
                  <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]">🏆 {i + 1}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div layout transition={spring} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.slice(3).map((u) => (
                <Card key={u.id} {...u} />
              ))}
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
      )}
    </div>
  )
}
