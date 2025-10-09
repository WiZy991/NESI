'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'

/* ---------- типы ---------- */
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

/* ---------- шкала уровней (в точности как в API) ---------- */
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

  /* -------- фильтры/сортировка -------- */
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [skill, setSkill] = useState('')
  const [minXp, setMinXp] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sortBy, setSortBy] = useState<'xp' | 'rating' | 'tasks'>('xp')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  /* -------- пагинация -------- */
  const [page, setPage] = useState(1)
  const take = 12

  /* -------- данные -------- */
  const [items, setItems] = useState<SpecialistItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* XP/Level текущего пользователя (для точного совпадения с экраном «Уровень») */
  const [myLevel, setMyLevel] = useState<MyLevel | null>(null)

  /* -------- query строка -------- */
  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (city.trim()) p.set('city', city.trim())
    if (skill.trim()) p.set('skill', skill.trim())
    if (minXp.trim()) p.set('minXp', String(parseInt(minXp, 10) || 0))
    if (minRating.trim()) p.set('minRating', String(parseFloat(minRating) || 0))
    p.set('sortBy', sortBy)
    p.set('order', order)
    p.set('page', String(page))
    p.set('take', String(take))
    return p.toString()
  }, [q, city, skill, minXp, minRating, sortBy, order, page])

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* -------- загрузка специалистов -------- */
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
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [queryString])

  /* при смене любого фильтра, кроме пагинации, сбрасываем на 1 страницу */
  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, skill, minXp, minRating, sortBy, order])

  /* -------- подтянуть мой точный XP из /api/users/me/level -------- */
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

  /* -------- карточка -------- */
  const Card = (u: SpecialistItem) => {
    const name = u.fullName || u.email || 'Без имени'
    const letter = (name[0] || '•').toUpperCase()
    // xp из бэка (xpComputed) → иначе xp
    let xpValue = (u.xpComputed ?? u.xp ?? 0) || 0
    let lvl = u.lvl
    let progress = u.progress
    let toNext = u.toNext

    // если это текущий пользователь и есть свежие данные из /users/me/level — подменяем
    if (user?.id && user.id === u.id && myLevel) {
      xpValue = myLevel.xp
      lvl = myLevel.level
      progress = myLevel.progressPercent
      toNext = myLevel.xpToNextLevel
    }

    // если из API не пришло lvl/progress — посчитаем на клиенте (на всякий случай)
    if (lvl == null || progress == null || toNext == null) {
      const calc = levelFromXp(xpValue)
      lvl = calc.lvl
      progress = calc.progress
      toNext = calc.toNext
    }

    const reviews = u.reviewsCount ?? u._count?.reviewsReceived ?? 0
    const skillsStr = Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || '')

    return (
      <div
        key={u.id}
        className="bg-black/50 backdrop-blur-sm text-white p-4 rounded-xl border border-emerald-700/30 hover:border-emerald-500/50 transition shadow-[0_0_30px_rgba(16,185,129,0.12)]"
      >
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt={name} className="w-12 h-12 rounded-full mb-2 object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-700 mb-2 flex items-center justify-center text-base font-bold">
            {letter}
          </div>
        )}

        <h3 className="text-lg font-semibold leading-tight">{name}</h3>
        <p className="text-xs text-gray-300 mb-3">{u.location || 'Без города'}</p>

        <div className="flex items-center justify-between text-xs mb-1">
          <span>
            Уровень: <span className="font-semibold text-white">{lvl}</span>
          </span>
          <span className="opacity-70">{xpValue} XP</span>
        </div>
        <div className="h-2 rounded bg-emerald-950/60 overflow-hidden mb-1">
          <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
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

        <Link href={`/users/${u.id}`} className="inline-block mt-3 text-emerald-300 hover:text-emerald-200 text-sm">
          Смотреть профиль →
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {user && <Onboarding role={user.role} />}  {/* ← добавил вызов Onboarding */}
      <h2 className="text-xl font-bold mb-4 text-white">⚡ Подиум исполнителей</h2>

      {/* Панель фильтров (не растягиваем фоном на всю страницу) */}
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

        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Сортировка</label>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded bg-black/60 text-white px-3 py-2 border border-emerald-800/50 focus:border-emerald-500"
            >
              <option value="xp">Опыт</option>
              <option value="rating">Рейтинг</option>
              <option value="tasks">Выполненные задачи</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as any)}
              className="rounded bg-black/60 text-white px-3 py-2 border border-emerald-800/50 focus:border-emerald-500"
            >
              <option value="desc">по убыванию</option>
              <option value="asc">по возрастанию</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="text-gray-300">Загрузка…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="text-gray-400">Исполнителей по текущим фильтрам не найдено</div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((u) => (
              <Card key={u.id} {...u} />
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-6 flex items-center gap-2 text-white">
              <button
                className="px-3 py-1 rounded border border-emerald-700/40 text-white disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Назад
              </button>
              <span className="text-gray-300 text-sm">
                Страница {page} из {pages} • всего {total}
              </span>
              <button
                className="px-3 py-1 rounded border border-emerald-700/40 text-white disabled:opacity-40"
                disabled={page >= pages}
                onClick{() => setPage((p) => Math.min(pages, p + 1))}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
