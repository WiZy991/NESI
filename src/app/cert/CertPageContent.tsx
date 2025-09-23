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
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  return { res, data }
}

/* =========================
   Тест-раннер
   ========================= */
function TestRunner({ subcategoryId, backTo }: { subcategoryId: string; backTo: string }) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [test, setTest] = useState<TestMeta | null>(null)
  const [questions, setQuestions] = useState<SafeQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string | null>(null)

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [leftSec, setLeftSec] = useState<number | null>(null)
  const [result, setResult] = useState<{ passed: boolean; score: number; outOfTime: boolean; passScore: number } | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  // Загружаем тест + стартуем попытку
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true); setErr(null); setNotFound(false)
      try {
        const r1 = await authFetch(`/api/cert/test?subcategoryId=${encodeURIComponent(subcategoryId)}`)
        if (r1.res.status === 404) {
          setNotFound(true)
          return
        }
        if (!r1.res.ok) throw new Error(r1.data?.error || `HTTP ${r1.res.status}`)

        const r2 = await authFetch('/api/cert/attempts/start', {
          method: 'POST',
          body: JSON.stringify({ testId: (r1.data as TestResponse).test.id })
        })
        if (!r2.res.ok) throw new Error(r2.data?.error || `HTTP ${r2.res.status}`)

        if (!cancelled) {
          const d1 = r1.data as TestResponse
          const d2 = r2.data as StartAttemptResponse
          setTest(d1.test)
          setQuestions(d1.questions)
          setAttemptId(d2.attemptId)
          const startedAt = new Date(d2.startedAt).getTime()
          const expiresAt = startedAt + d2.timeLimitSec * 1000
          setLeftSec(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Ошибка загрузки теста')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [subcategoryId, reloadKey])

  // Таймер
  useEffect(() => {
    if (!test) return
    const t = setInterval(() => setLeftSec(prev => (prev == null ? prev : Math.max(0, prev - 1))), 1000)
    return () => clearInterval(t)
  }, [test])

  const onSubmit = async () => {
    if (!attemptId) return
    try {
      setLoading(true); setErr(null)
      const payload = {
        attemptId,
        answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId }))
      }
      const r = await authFetch('/api/cert/attempts/submit', { method: 'POST', body: JSON.stringify(payload) })
      if (!r.res.ok) throw new Error(r.data?.error || `HTTP ${r.res.status}`)
      setResult({
        passed: r.data.passed,
        score: r.data.score,
        outOfTime: !!r.data.outOfTime,
        passScore: r.data.passScore ?? (test?.passScore ?? 80)
      })
    } catch (e: any) {
      setErr(e.message || 'Ошибка проверки')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return <div className="p-6 text-red-400">Тест для подкатегории не найден.</div>
  }
  if (loading && !test) return <div className="p-6 text-gray-400">Загрузка…</div>
  if (err && !test) return <div className="p-6 text-red-400">Ошибка: {err}</div>
  if (!test) return null

  if (result) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Результат</h1>
        {result.passed ? (
          <div className="text-emerald-400">✅ Сертификат получен! Балл: {result.score}%</div>
        ) : (
          <div className="text-red-400">❌ Недостаточно баллов: {result.score}% (нужно ≥{result.passScore}%)</div>
        )}
        <button onClick={() => router.push(backTo)} className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700">Назад</button>
      </div>
    )
  }

  const total = questions.length
  const canSubmit = Object.keys(answers).length === total

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{test.title}</h1>
        <div className={`font-mono ${leftSec !== null && leftSec <= 30 ? 'text-red-400' : 'text-gray-300'}`}>
          ⏳ {fmtLeft(leftSec)}
        </div>
      </div>

      {/* Вопрос */}
      <div>
        <p className="mb-3 font-medium">{questions[idx].text}</p>
        <div className="space-y-2">
          {questions[idx].options.map(o => {
            const checked = answers[questions[idx].id] === o.id
            return (
              <label key={o.id} className={`flex items-center gap-3 p-2 rounded border cursor-pointer ${checked ? 'border-white bg-gray-800' : 'border-gray-700 bg-gray-900'}`}>
                <input
                  type="radio"
                  className="accent-white"
                  name={questions[idx].id}
                  checked={checked}
                  onChange={() => setAnswers(a => ({ ...a, [questions[idx].id]: o.id }))}
                />
                {o.text}
              </label>
            )
          })}
        </div>
      </div>

      {/* Навигация */}
      <div className="flex justify-between">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
        >
          Назад
        </button>
        {idx < total - 1 ? (
          <button
            onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
            disabled={!answers[questions[idx]?.id]}
            className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200 disabled:opacity-50"
          >
            Далее
          </button>
        ) : (
          <button
            onClick={() => void onSubmit()}
            disabled={!canSubmit}
            className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200 disabled:opacity-50"
          >
            Завершить
          </button>
        )}
      </div>

      {err && <div className="text-red-400">{err}</div>}
    </div>
  )
}

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
