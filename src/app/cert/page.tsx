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
const ANIMATION_SUBCAT_ID = 'de8d0f7c-d42a-45b6-b24e-c1b41eef6a4b' // "Анимация и видео"

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
/** fetch с поддержкой cookies + Bearer */
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
function TestRunner({ subcategoryId, backTo }: { subcategoryId: string; backTo: string }) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [notFound, setNotFound] = useState<boolean>(false)

  const [test, setTest] = useState<TestMeta | null>(null)
  const [questions, setQuestions] = useState<SafeQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string | null>(null)

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [leftSec, setLeftSec] = useState<number | null>(null)
  const [result, setResult] = useState<{ passed: boolean; score: number; outOfTime: boolean; passScore: number } | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  // Загрузка теста + старт попытки
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true); setErr(null); setNotFound(false)
      try {
        const r1 = await authFetch(`/api/cert/test?subcategoryId=${encodeURIComponent(subcategoryId)}`)
        if (r1.res.status === 404) { // аккуратный 404 — показываем блок создания
          setNotFound(true)
          setErr(null)
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

  // Авто-сабмит при нуле
  useEffect(() => {
    if (test && leftSec === 0 && !result) { void onSubmit() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftSec])

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

  /* ---- 404: теста нет ---- */
  if (notFound) {
    const allowCreate = subcategoryId === ANIMATION_SUBCAT_ID
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Сертификация</h1>
        <div className="text-red-400">Тест для подкатегории не найден.</div>

        {allowCreate ? (
          <button
            className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
            onClick={async () => {
              try {
                setLoading(true); setErr(null)
                await createAnimationVideoTest(subcategoryId)
                setReloadKey(k => k + 1) // перезапускаем загрузку (старт новой попытки)
              } catch (e: any) {
                setErr(e.message || 'Не удалось создать тест')
              } finally {
                setLoading(false)
              }
            }}
          >
            Создать тест «Анимация и видео» и пройти
          </button>
        ) : (
          <div className="text-gray-400">
            Для этой подкатегории тест ещё не заведён.
          </div>
        )}

        {err && <div className="text-red-400">{err}</div>}
      </div>
    )
  }

  /* ---- Загрузка/ошибка ---- */
  if (loading && !test) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Сертификация</h1>
        <div className="text-gray-400">Загрузка…</div>
      </div>
    )
  }
  if (err && !test) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Сертификация</h1>
        <div className="text-red-400">Ошибка: {err}</div>
      </div>
    )
  }
  if (!test) return null

  /* ---- Результат ---- */
  if (result) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Сертификация</h1>
        {result.passed ? (
          <div className="rounded border border-emerald-400/30 bg-emerald-500/10 p-4">
            <div className="font-semibold text-emerald-300">Сертификат получен</div>
            <div className="text-emerald-200">Ваш результат: {result.score}%</div>
          </div>
        ) : (
          <div className="rounded border border-red-400/30 bg-red-500/10 p-4">
            <div className="font-semibold text-red-300">Не дотянули до проходного балла</div>
            <div className="text-red-200">
              Ваш результат: {result.score}% (нужно ≥{result.passScore}%){result.outOfTime ? ' • истекло время' : ''}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded border border-gray-700 bg-gray-900 hover:bg-gray-800"
            onClick={() => router.back()}
          >
            Назад
          </button>
          {!result.passed && (
            <button
              className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200"
              onClick={() => {
                // перезапускаем новую попытку без смены URL
                setResult(null)
                setAnswers({})
                setIdx(0)
                setReloadKey(k => k + 1)
              }}
            >
              Пройти ещё раз
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ---- Прохождение теста ---- */
  const total = questions.length
  const canSubmit = Object.keys(answers).length === total

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{test.title || 'Сертификация'}</h1>
          <div className="text-gray-400 text-sm">Подкатегория: <span className="font-mono">{subcategoryId}</span></div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Осталось</div>
          <div className={`font-mono text-lg ${leftSec !== null && leftSec <= 30 ? 'text-red-300' : ''}`}>{fmtLeft(leftSec)}</div>
        </div>
      </div>

      {/* Прогресс */}
      <div className="w-full bg-gray-800 h-2 rounded">
        <div className="h-2 rounded bg-white" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>
      <div className="text-gray-400 text-sm">{idx + 1} / {total} • Проходной балл: {test.passScore}%</div>

      {/* Вопрос */}
      {questions[idx] && (
        <div className="space-y-4">
          <div className="font-medium">{questions[idx].text}</div>
          <div className="space-y-2">
            {questions[idx].options.map(o => {
              const checked = answers[questions[idx].id] === o.id
              return (
                <label
                  key={o.id}
                  className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${checked ? 'border-white' : 'border-gray-700'} bg-gray-900 hover:bg-gray-800`}
                >
                  <input
                    type="radio"
                    className="accent-white"
                    name={questions[idx].id}
                    checked={checked}
                    onChange={() => setAnswers(a => ({ ...a, [questions[idx].id]: o.id }))}
                  />
                  <span>{o.text}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Навигация */}
      <div className="flex items-center justify-between">
        <button
          className="px-4 py-2 rounded border border-gray-700 bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          Назад
        </button>

        {idx < total - 1 ? (
          <button
            className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200 disabled:opacity-50"
            onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
            disabled={!answers[questions[idx]?.id]}
          >
            Далее
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded bg-white text-black hover:bg-gray-200 disabled:opacity-50"
            onClick={() => void onSubmit()}
            disabled={!canSubmit || !attemptId}
          >
            Завершить
          </button>
        )}
      </div>

      {/* Ошибки во время прохождения */}
      {err && <div className="text-red-400">{err}</div>}
    </div>
  )
}

/* =========================
   Страница /cert
   ========================= */
export default function CertPage() {
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

  // Экран выбора направления
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Сертификация</h1>
      <p className="text-gray-300 mb-6">
        Выбери направление, по которому хочешь пройти тест. После успешного прохождения
        появится доступ к откликам по задачам этой подкатегории.
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
