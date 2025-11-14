'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClipboardList, BarChart3, Mail, User, Clock, Download } from 'lucide-react'

type ResponseStatus = 'pending' | 'viewed' | 'responded' | 'hired' | 'rejected'
type ResponseStatusFilter = 'all' | ResponseStatus

interface StatusHistoryEntry {
  id: string
  status: ResponseStatus
  note: string | null
  createdAt: string
  changedBy?: {
    id: string
    fullName: string | null
    email: string | null
  } | null
}

interface Response {
  id: string
  message: string | null
  price: number | null
  createdAt: string
  status: ResponseStatus
  statusHistory: StatusHistoryEntry[]
  task: {
    id: string
    title: string
    customer: {
      id: string
      fullName: string | null
      email: string | null
    } | null
    subcategory: {
      id: string
      name: string
      category: {
        id: string
        name: string
      } | null
    } | null
  }
}

interface ResponsesAnalytics {
  total: number
  conversionRate: number
  averagePrice: number | null
  avgResponseTimeMs: number | null
  followUpRate: number
  viewedRate: number
  topCategories: Array<{ name: string; hired: number; total: number; successRate: number }>
  hiredCount: number
  respondedCount: number
  viewedCount: number
}

interface RawStatusHistoryEntry {
  id: string
  status: ResponseStatus
  note?: string | null
  createdAt: string
  changedBy?: {
    id: string
    fullName: string | null
    email: string | null
  } | null
}

interface RawTaskResponse {
  id: string
  message: string | null
  price: number | string | null
  createdAt: string
  status: ResponseStatus
  statusHistory: RawStatusHistoryEntry[] | null
  task: {
    id: string
    title: string
    customer: {
      id: string
      fullName: string | null
      email: string | null
    } | null
    subcategory: {
      id: string
      name: string
      category: {
        id: string
        name: string
      } | null
    } | null
  }
}

interface ResponsesApiPayload {
  responses?: RawTaskResponse[]
}

const STATUS_TABS: Array<{ value: ResponseStatusFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'viewed', label: 'Просмотрен' },
  { value: 'responded', label: 'Есть ответ' },
  { value: 'hired', label: 'Наняли' },
  { value: 'rejected', label: 'Отказ' },
]

const STATUS_ORDER: ResponseStatus[] = ['pending', 'viewed', 'responded', 'hired', 'rejected']
const WITHDRAWABLE_STATUSES: readonly ResponseStatus[] = ['pending', 'viewed', 'responded'] as const

const statusLabels: Record<ResponseStatus, string> = {
  pending: 'Ожидает ответа',
  viewed: 'Просмотрено заказчиком',
  responded: 'Получен ответ',
  hired: 'Вы назначены исполнителем',
  rejected: 'Отказ или закрытие',
}

const statusDescriptions: Record<ResponseStatus, string> = {
  pending: 'Заказчик ещё не видел или не ответил на ваш отклик.',
  viewed: 'Заказчик открыл ваш отклик и видел ваше предложение.',
  responded: 'Заказчик оставил комментарий или связался с вами.',
  hired: 'Вы назначены исполнителем по этой задаче.',
  rejected: 'Заказчик выбрал другого исполнителя или закрыл отклик.',
}

const statusBadgeStyles: Record<ResponseStatus, string> = {
  pending:
    'border-slate-400/60 text-slate-200 shadow-[0_0_12px_rgba(148,163,184,0.25)] bg-slate-900/40',
  viewed:
    'border-blue-400/60 text-blue-100 shadow-[0_0_14px_rgba(59,130,246,0.28)] bg-blue-900/40',
  responded:
    'border-indigo-400/60 text-indigo-100 shadow-[0_0_14px_rgba(99,102,241,0.28)] bg-indigo-900/40',
  hired:
    'border-emerald-400/70 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.32)] bg-emerald-900/40',
  rejected:
    'border-red-500/60 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.32)] bg-red-900/40',
}

const statusProgressColors: Record<ResponseStatus, string> = {
  pending: 'bg-slate-500/70',
  viewed: 'bg-blue-500/70',
  responded: 'bg-indigo-500/70',
  hired: 'bg-emerald-500/80',
  rejected: 'bg-red-600/70',
}

const statusNumberColors: Record<ResponseStatus, string> = {
  pending: 'text-slate-200',
  viewed: 'text-blue-200',
  responded: 'text-indigo-200',
  hired: 'text-emerald-200',
  rejected: 'text-red-200',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getHistoryActorName(entry: StatusHistoryEntry) {
  if (!entry.changedBy) return 'Система'
  return entry.changedBy.fullName || entry.changedBy.email || 'Система'
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeResponse(raw: RawTaskResponse): Response {
  return {
    id: raw.id,
    message: raw.message ?? null,
    price: toNumberOrNull(raw.price),
    createdAt: raw.createdAt,
    status: raw.status,
    statusHistory: (raw.statusHistory ?? []).map(entry => ({
      id: entry.id,
      status: entry.status,
      note: entry.note ?? null,
      createdAt: entry.createdAt,
      changedBy: entry.changedBy
        ? {
            id: entry.changedBy.id,
            fullName: entry.changedBy.fullName ?? null,
            email: entry.changedBy.email ?? null,
          }
        : null,
    })),
    task: {
      id: raw.task.id,
      title: raw.task.title,
      customer: raw.task.customer
        ? {
            id: raw.task.customer.id,
            fullName: raw.task.customer.fullName ?? null,
            email: raw.task.customer.email ?? null,
          }
        : null,
      subcategory: raw.task.subcategory
        ? {
            id: raw.task.subcategory.id,
            name: raw.task.subcategory.name,
            category: raw.task.subcategory.category
              ? {
                  id: raw.task.subcategory.category.id,
                  name: raw.task.subcategory.category.name,
                }
              : null,
          }
        : null,
    },
  }
}

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return `${value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₽`
}

function formatDuration(ms: number | null) {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return '—'
  const totalMinutes = Math.floor(ms / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}д ${hours}ч`
  }
  if (hours > 0) {
    return `${hours}ч ${minutes}м`
  }
  return `${minutes}м`
}

export default function MyResponsesPage() {
  const { token } = useUser()
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<ResponseStatusFilter>('all')
  const [error, setError] = useState<string | null>(null)

  const fetchResponses = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/responses/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        const message =
          (typeof payload?.error === 'string' && payload.error) || 'Не удалось загрузить отклики'
        setResponses([])
        setError(message)
        return
      }
      const data = (await res.json()) as ResponsesApiPayload
      const normalized = (data.responses ?? []).map(normalizeResponse)
      setResponses(normalized)
    } catch (err) {
      console.error('Не удалось загрузить отклики', err)
      setResponses([])
      setError('Произошла ошибка при загрузке откликов')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setResponses([])
      setLoading(false)
      return
    }
    fetchResponses()
  }, [token, fetchResponses])

  const { confirm, Dialog } = useConfirm()

  const handleWithdraw = async (responseId: string) => {
    if (!token) return
    await confirm({
      title: 'Отзыв отклика',
      message: 'Вы уверены, что хотите отозвать этот отклик? Это действие нельзя отменить.',
      type: 'warning',
      confirmText: 'Отозвать',
      cancelText: 'Отмена',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/responses/${responseId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) throw new Error('Не удалось удалить')
          setResponses(prev => prev.filter(r => r.id !== responseId))
          toast.success('Отклик отозван')
        } catch (err) {
          console.error(err)
          toast.error('Ошибка при отзыве отклика')
        }
      },
    })
  }

  const handleExportJSON = useCallback(() => {
    if (responses.length === 0) return
    const payload = responses.map(response => ({
      ...response,
      price: response.price,
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `responses-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [responses])

  const handleExportCSV = useCallback(() => {
    if (responses.length === 0) return
    const headers = [
      'ID отклика',
      'Задача',
      'Статус',
      'Цена',
      'Дата отклика',
      'Заказчик',
      'Подкатегория',
      'Категория',
      'Последний статус',
    ]

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`

    const rows = responses.map(response => {
      const customerName =
        response.task.customer?.fullName ||
        response.task.customer?.email ||
        response.task.customer?.id ||
        '—'
      const lastStatus = response.statusHistory.at(-1)?.status ?? response.status
      return [
        response.id,
        response.task.title,
        statusLabels[response.status],
        response.price ?? '',
        formatDateTime(response.createdAt),
        customerName,
        response.task.subcategory?.name ?? '—',
        response.task.subcategory?.category?.name ?? '—',
        statusLabels[lastStatus as ResponseStatus] ?? lastStatus,
      ]
    })

    const csv = [headers, ...rows]
      .map(row => row.map(value => escape(String(value ?? ''))).join(';'))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `responses-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [responses])

  const { stats, percentages, analytics }: { stats: Record<ResponseStatus, number>; percentages: Record<ResponseStatus, number>; analytics: ResponsesAnalytics } = useMemo(() => {
    const baseCounts: Record<ResponseStatus, number> = {
      pending: 0,
      viewed: 0,
      responded: 0,
      hired: 0,
      rejected: 0,
    }
    let priceSum = 0
    let priceCount = 0
    const responseDurations: number[] = []
    const categoryStats = new Map<string, { total: number; hired: number }>()

    responses.forEach(response => {
      baseCounts[response.status] = (baseCounts[response.status] ?? 0) + 1
      if (typeof response.price === 'number' && Number.isFinite(response.price)) {
        priceSum += response.price
        priceCount += 1
      }

      const firstReaction = response.statusHistory.find(entry => entry.status !== 'pending')
      if (firstReaction) {
        const createdAt = new Date(response.createdAt).getTime()
        const reactedAt = new Date(firstReaction.createdAt).getTime()
        const diff = reactedAt - createdAt
        if (Number.isFinite(diff) && diff > 0) {
          responseDurations.push(diff)
        }
      }

      const categoryName =
        response.task.subcategory?.category?.name ??
        response.task.subcategory?.name ??
        'Без категории'
      const stat = categoryStats.get(categoryName) ?? { total: 0, hired: 0 }
      stat.total += 1
      if (response.status === 'hired') {
        stat.hired += 1
      }
      categoryStats.set(categoryName, stat)
    })

    const total = responses.length
    const safeTotal = Math.max(total, 1)
    const percents = STATUS_ORDER.reduce((acc, status) => {
      acc[status] = (baseCounts[status] / safeTotal) * 100
      return acc
    }, {} as Record<ResponseStatus, number>)

    const averagePrice = priceCount > 0 ? priceSum / priceCount : null
    const avgResponseTimeMs =
      responseDurations.length > 0
        ? responseDurations.reduce((acc, value) => acc + value, 0) / responseDurations.length
        : null

    const topCategories = Array.from(categoryStats.entries())
      .map(([name, value]) => ({
        name,
        hired: value.hired,
        total: value.total,
        successRate: value.total > 0 ? (value.hired / value.total) * 100 : 0,
      }))
      .sort((a, b) => {
        if (b.successRate === a.successRate) {
          return b.hired - a.hired
        }
        return b.successRate - a.successRate
      })
      .slice(0, 3)

    const analytics: ResponsesAnalytics = {
      total,
      conversionRate: total > 0 ? (baseCounts.hired / total) * 100 : 0,
      averagePrice,
      avgResponseTimeMs,
      followUpRate: total > 0 ? (baseCounts.responded / total) * 100 : 0,
      viewedRate: total > 0 ? (baseCounts.viewed / total) * 100 : 0,
      topCategories,
      hiredCount: baseCounts.hired,
      respondedCount: baseCounts.responded,
      viewedCount: baseCounts.viewed,
    }

    return { stats: baseCounts, percentages: percents, analytics }
  }, [responses])

  const filteredResponses = useMemo(() => {
    if (filterStatus === 'all') return responses
    return responses.filter(response => response.status === filterStatus)
  }, [responses, filterStatus])

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-400 animate-pulse">
        Загрузка откликов...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto mt-12 p-6 text-white space-y-8">
      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3">
          {error}
        </div>
      ) : null}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-bold text-emerald-400 flex items-center gap-2"
      >
        <ClipboardList className="w-7 h-7 text-emerald-400" />
        Мои отклики
      </motion.h1>

      <div className="bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_25px_rgba(0,255,150,0.12)] p-6 backdrop-blur-md space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Статистика по статусам
          </h2>
          <div className="text-sm text-gray-400">Всего откликов: {responses.length}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          {STATUS_ORDER.map(status => (
            <div key={status} className="rounded-xl bg-black/30 border border-emerald-500/10 p-3">
              <span className={`text-xl font-semibold ${statusNumberColors[status]}`}>
                {stats[status]}
              </span>
              <p className="text-xs text-gray-400 mt-1">{statusLabels[status]}</p>
            </div>
          ))}
        </div>

        <div className="h-3 rounded-full bg-gray-900 overflow-hidden flex shadow-inner border border-emerald-500/10">
          {STATUS_ORDER.map(status => (
            <div
              key={status}
              style={{ width: `${percentages[status]}%` }}
              className={`${statusProgressColors[status]} transition-[width] duration-500`}
            />
          ))}
        </div>
      </div>

      <div className="bg-black/40 border border-emerald-500/30 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)] p-6 backdrop-blur-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-emerald-300 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Аналитика эффективности
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              disabled={responses.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              <Download className="w-4 h-4" />
              Экспорт CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={responses.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              <Download className="w-4 h-4" />
              Экспорт JSON
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-200/70">Конверсия в найм</p>
            <p className="text-2xl font-semibold text-emerald-100 mt-2">
              {analytics.conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-emerald-200/60 mt-1">
              {analytics.hiredCount} из {analytics.total} откликов завершились наймом
            </p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-200/70">Средняя ставка</p>
            <p className="text-2xl font-semibold text-blue-100 mt-2">
              {formatCurrency(analytics.averagePrice)}
            </p>
            <p className="text-xs text-blue-200/60 mt-1">
              Учитываются только отклики с указанной ценой
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <p className="text-sm text-indigo-200/70">Среднее время реакции заказчика</p>
            <p className="text-2xl font-semibold text-indigo-100 mt-2">
              {formatDuration(analytics.avgResponseTimeMs)}
            </p>
            <p className="text-xs text-indigo-200/60 mt-1">
              До первого просмотра или ответа по отклику
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200/70">Доля откликов с обратной связью</p>
            <p className="text-2xl font-semibold text-amber-100 mt-2">
              {analytics.followUpRate.toFixed(1)}%
            </p>
            <p className="text-xs text-amber-200/60 mt-1">
              {analytics.respondedCount} откликов получили ответ от заказчика
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/15 bg-black/30 p-4">
            <h3 className="text-sm font-semibold text-emerald-200 uppercase tracking-wide mb-3">
              Топ категорий по успеху
            </h3>
            {analytics.topCategories.length === 0 ? (
              <p className="text-sm text-gray-500">Недостаточно данных для анализа.</p>
            ) : (
              <ul className="space-y-3">
                {analytics.topCategories.map(category => (
                  <li
                    key={category.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-emerald-100 font-medium">{category.name}</span>
                      <span className="text-xs text-emerald-200/70">
                        Наймов: {category.hired} из {category.total}
                      </span>
                    </div>
                    <span className="text-emerald-100 font-semibold">
                      {category.successRate.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-500/15 bg-black/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-emerald-200 uppercase tracking-wide">
              Быстрые инсайты
            </h3>
            <p className="text-sm text-gray-300">
              {analytics.viewedCount} откликов уже просмотрены заказчиками (
              {analytics.viewedRate.toFixed(1)}%).
            </p>
            <p className="text-sm text-gray-300">
              В среднем ответ приходит через {formatDuration(analytics.avgResponseTimeMs)}. Если
              ответов нет — стоит написать заказчику напрямую.
            </p>
            <p className="text-sm text-gray-300">
              Экспортируйте данные, чтобы построить собственные отчёты или поделиться статистикой с
              командой.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {STATUS_TABS.map(tab => {
          const isActive = filterStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 rounded-full border transition shadow-sm ${
                isActive
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'border-gray-700 text-gray-400 hover:text-emerald-200 hover:border-emerald-500/40'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {filteredResponses.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-emerald-500/10 rounded-2xl bg-black/40">
          Нет откликов по выбранному фильтру
        </div>
      ) : (
        <motion.ul
          className="grid gap-6 md:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {filteredResponses.map(response => {
            const customer = response.task.customer
            const customerName = customer?.fullName || customer?.email || '—'

            return (
              <motion.li
                key={response.id}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                className="relative bg-black/40 border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-4 hover:border-emerald-400/40 transition-all duration-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/tasks/${response.task.id}`}
                    className="text-lg font-semibold text-emerald-400 hover:underline flex items-center gap-2"
                  >
                    <Mail className="w-5 h-5 text-emerald-400" />
                    {response.task.title}
                  </Link>
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusBadgeStyles[response.status]}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {statusLabels[response.status]}
                  </span>
                </div>

                <div className="text-sm text-gray-400 flex flex-wrap items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  Заказчик:
                  {customer?.id ? (
                    <Link
                      href={`/users/${customer.id}`}
                      className="text-blue-400 hover:underline hover:text-blue-300 transition"
                    >
                      {customerName}
                    </Link>
                  ) : (
                    <span className="text-blue-300/70">{customerName}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>Дата отклика: {formatDateTime(response.createdAt)}</span>
                  {response.price !== null && (
                    <span className="text-emerald-300 text-sm font-semibold">
                      💰 {response.price} ₽
                    </span>
                  )}
                </div>

                {response.message && (
                  <div className="bg-black/30 border border-emerald-500/20 rounded-xl p-3 text-sm text-gray-200">
                    {response.message}
                  </div>
                )}

                <div className="rounded-xl border border-emerald-500/15 bg-black/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-200 text-sm font-semibold uppercase tracking-wide">
                    <Clock className="w-4 h-4" />
                    История статусов
                  </div>

                  {response.statusHistory.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      История пока пуста. Статусы будут появляться по мере обработки отклика.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {response.statusHistory.map(entry => (
                        <li
                          key={entry.id}
                          className="border-l border-emerald-500/30 pl-3 ml-2 text-sm text-gray-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="font-semibold text-emerald-200">
                                {statusLabels[entry.status]}
                              </div>
                              <p className="text-xs text-gray-400">
                                {statusDescriptions[entry.status]}
                              </p>
                              {entry.note ? (
                                <p className="text-xs text-gray-400 italic">{entry.note}</p>
                              ) : null}
                              <p className="text-xs text-gray-500">
                                Обновил: <span className="text-emerald-200">{getHistoryActorName(entry)}</span>
                              </p>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDateTime(entry.createdAt)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {WITHDRAWABLE_STATUSES.includes(response.status) && (
                  <button
                    onClick={() => handleWithdraw(response.id)}
                    className="self-end px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm transition"
                  >
                    Отозвать отклик
                  </button>
                )}
              </motion.li>
            )
          })}
        </motion.ul>
      )}
      {Dialog}
    </div>
  )
}
