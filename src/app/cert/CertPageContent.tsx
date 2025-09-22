'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

/* =========================
   Типы
   ========================= */
type Subcategory = { id: string; name: string }
type Category = { id: string; name: string; subcategories: Subcategory[] }

type SafeOption = { id: string; text: string }
type SafeQuestion = { id: string; text: string; options: SafeOption[] }
type TestMeta = {
  id: string
  title: string
  timeLimitSec: number
  passScore: number
  questionCount: number
}
type TestResponse = { test: TestMeta; questions: SafeQuestion[] }
type StartAttemptResponse = { attemptId: string; startedAt: string; timeLimitSec: number }

/* =========================
   Константы
   ========================= */
const ANIMATION_SUBCAT_ID = 'de8d0f7c-d42a-45b6-b24e-c1b41eef6a4b'

/* =========================
   Утилиты
   ========================= */
function fmtLeft(sec: number | null) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
function getAuthToken(): string | null {
  try {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwt') ||
      null
    )
  } catch {
    return null
  }
}
async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthToken()
  const headers = new Headers(init.headers as HeadersInit)
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  const res = await fetch(input, { ...init, credentials: 'include', headers })
  const text = await res.text()
  let data: any = null
  try { data = JSON.parse(text) } catch { data = { error: text } }
  return { res, data }
}

/* =========================
   Тест-раннер
   ========================= */
// оставляем твой TestRunner без изменений
// ...

/* =========================
   Страница /cert
   ========================= */
export default function CertPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialSubcategoryId = searchParams.get('subcategoryId') || ''
  const backTo = searchParams.get('backTo') || '/tasks'
  const [subcategoryId, setSubcategoryId] = useState<string>(initialSubcategoryId)

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showTest = useMemo(() => Boolean(subcategoryId), [subcategoryId])

  useEffect(() => {
    if (subcategoryId) return
    let cancelled = false
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const { res, data } = await authFetch('/api/categories')
        if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки категорий')
        if (!cancelled) setCategories(data.categories || [])
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Ошибка при загрузке категорий')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [subcategoryId])

  const handleChooseSubcategory = (id: string) => {
    setSubcategoryId(id)
    const url = new URL(window.location.href)
    url.searchParams.set('subcategoryId', id)
    router.replace(url.pathname + '?' + url.searchParams.toString())
  }

  if (showTest) return <TestRunner subcategoryId={subcategoryId} backTo={backTo} />

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Сертификация</h1>
      <p className="text-gray-300 mb-6">
        Выбери направление, по которому хочешь пройти тест.
      </p>

      {loading ? (
        <div className="text-gray-400">Загрузка категорий…</div>
      ) : error ? (
        <div className="text-red-400">Ошибка: {error}</div>
      ) : categories.length === 0 ? (
        <div className="text-gray-400">Категории пока не добавлены.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded border border-gray-700 bg-gray-900 p-4">
              <h2 className="font-semibold mb-3">{cat.name}</h2>
              {cat.subcategories?.length ? (
                <div className="flex flex-wrap gap-2">
                  {cat.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleChooseSubcategory(sub.id)}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-gray-700 text-sm"
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Подкатегорий пока нет.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
