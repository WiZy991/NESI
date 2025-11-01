'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, TrendingUp, Award, Calendar, DollarSign, Briefcase, CheckCircle2, Star, Filter } from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Area,
  AreaChart 
} from 'recharts'

type Analytics = {
  userId: string
  role: string
  createdAt: string
  completedTasksCount: number
  avgRating: number
  type: 'customer' | 'executor' | 'user'
  period: string
  stats: {
    chartData?: Array<{ period: string; total: number; count: number }>
    [key: string]: any
  }
}

type PeriodOption = {
  value: string
  label: string
}

const periodOptions: PeriodOption[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

export default function AnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    fetchAnalytics(period)
  }, [period])

  const fetchAnalytics = async (selectedPeriod: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/users/me/analytics?period=${selectedPeriod}`)
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Ошибка загрузки')
      const data = await res.json()
      setAnalytics(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Кастомный тултип для графика
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-emerald-500/50 rounded-lg p-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <p className="text-emerald-400 font-semibold mb-1">{payload[0].payload.period}</p>
          <p className="text-white">
            {analytics?.type === 'customer' ? 'Потрачено' : 'Заработано'}: 
            <span className="text-emerald-400 font-bold ml-2">
              {Number(payload[0].value).toFixed(2)}₽
            </span>
          </p>
          <p className="text-gray-400 text-sm">
            Транзакций: {payload[0].payload.count}
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-300 text-lg animate-pulse">Загрузка аналитики...</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Ошибка загрузки данных</div>
      </div>
    )
  }

  // Форматируем данные для графика
  const chartData = analytics.stats.chartData?.map((item: any) => ({
    period: item.period,
    total: Number(item.total),
    count: item.count,
  })) || []

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-400 mb-3 flex items-center justify-center gap-3">
            <BarChart3 className="w-10 h-10" />
            Персональная аналитика
          </h1>
          <p className="text-gray-300 text-lg">
            Ваша статистика на платформе NESI
          </p>
        </div>

        {/* Фильтр периода */}
        <div className="mb-8">
          <div className="bg-black/40 p-4 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-emerald-400" />
              <h3 className="text-emerald-400 font-semibold">Период</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                    period === option.value
                      ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-gray-800/50 text-gray-400 border border-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Аналитика для заказчиков */}
        {analytics.type === 'customer' && (
          <>
            {/* Основные метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <Briefcase className="w-4 h-4" />
                  Создано задач
                </div>
                <div className="text-white text-4xl font-bold">{analytics.stats?.tasksCreated || 0}</div>
              </div>

              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Завершено задач
                </div>
                <div className="text-white text-4xl font-bold">{analytics.completedTasksCount}</div>
              </div>

              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <DollarSign className="w-4 h-4" />
                  Потрачено
                </div>
                <div className="text-white text-4xl font-bold">{analytics.stats?.totalSpent?.toFixed(0) || 0}₽</div>
              </div>

              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <Star className="w-4 h-4" />
                  Средний рейтинг
                </div>
                <div className="text-white text-4xl font-bold">{analytics.avgRating?.toFixed(1) || '0.0'}</div>
              </div>
            </div>

            {/* График активности */}
            {chartData.length > 0 && (
              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-8">
                <h2 className="text-emerald-400 text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Динамика расходов
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#10b981" opacity={0.1} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#10b981" 
                        tick={{ fill: '#10b981' }}
                      />
                      <YAxis 
                        stroke="#10b981"
                        tick={{ fill: '#10b981' }}
                        tickFormatter={(value) => `${value}₽`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fill="url(#colorTotal)"
                        dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#000' }}
                        activeDot={{ r: 8, strokeWidth: 2, stroke: '#10b981' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* Аналитика для исполнителей */}
        {analytics.type === 'executor' && (
          <>
            {/* Основные метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Выполнено задач
                </div>
                <div className="text-white text-4xl font-bold">{analytics.completedTasksCount}</div>
              </div>

              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <DollarSign className="w-4 h-4" />
                  Заработано
                </div>
                <div className="text-white text-4xl font-bold">{analytics.stats?.totalEarned?.toFixed(0) || 0}₽</div>
              </div>

              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <Star className="w-4 h-4" />
                  Средний рейтинг
                </div>
                <div className="text-white text-4xl font-bold">{analytics.avgRating?.toFixed(1) || '0.0'}</div>
              </div>

              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
                  <Award className="w-4 h-4" />
                  Конверсия
                </div>
                <div className="text-white text-4xl font-bold">{analytics.stats?.responseRate || 0}%</div>
              </div>
            </div>

            {/* График заработка */}
            {chartData.length > 0 && (
              <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-8">
                <h2 className="text-emerald-400 text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Динамика заработка
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#10b981" opacity={0.1} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#10b981"
                        tick={{ fill: '#10b981' }}
                      />
                      <YAxis 
                        stroke="#10b981"
                        tick={{ fill: '#10b981' }}
                        tickFormatter={(value) => `${value}₽`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="total" 
                        fill="url(#barGradient)"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* Общая статистика */}
        <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <h2 className="text-emerald-400 text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Общая информация
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div>
              <span className="text-gray-400">Дата регистрации:</span>
              <span className="ml-2 text-white font-semibold">
                {new Date(analytics.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Роль:</span>
              <span className="ml-2 text-white font-semibold capitalize">
                {analytics.role === 'customer' ? 'Заказчик' : 'Исполнитель'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Всего задач:</span>
              <span className="ml-2 text-emerald-400 font-semibold">
                {analytics.completedTasksCount}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Средний рейтинг:</span>
              <span className="ml-2 text-emerald-400 font-semibold flex items-center gap-1">
                <Star className="w-4 h-4 fill-emerald-400" />
                {analytics.avgRating?.toFixed(1) || '0.0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
