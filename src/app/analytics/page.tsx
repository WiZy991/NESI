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
        <div className="bg-black/90 border border-emerald-500/50 rounded-lg p-2 sm:p-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-xs sm:text-sm">
          <p className="text-emerald-400 font-semibold mb-1">{payload[0].payload.period}</p>
          <p className="text-white">
            {analytics?.type === 'customer' ? 'Потрачено' : 'Заработано'}: 
            <span className="text-emerald-400 font-bold ml-2">
              {Number(payload[0].value).toFixed(2)}₽
            </span>
          </p>
          <p className="text-gray-400 text-xs">
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
    <div className="min-h-screen py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-400 mb-2 sm:mb-3 flex items-center justify-center gap-2 sm:gap-3">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
            <span>Персональная аналитика</span>
          </h1>
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">
            Ваша статистика на платформе NESI
          </p>
        </div>

        {/* Фильтр периода */}
        <div className="mb-4 sm:mb-8">
          <div className="bg-black/40 p-3 sm:p-4 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <h3 className="text-emerald-400 font-semibold text-sm sm:text-base">Период</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`px-3 py-1.5 sm:px-6 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-8">
              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Создано задач</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.stats?.tasksCreated || 0}</div>
              </div>

              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Завершено задач</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.completedTasksCount}</div>
              </div>

              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Потрачено</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.stats?.totalSpent?.toFixed(0) || 0}₽</div>
              </div>

              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Средний рейтинг</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.avgRating?.toFixed(1) || '0.0'}</div>
              </div>
            </div>

            {/* График активности */}
            {chartData.length > 0 && (
              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-4 sm:mb-8">
                <h2 className="text-emerald-400 text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  Динамика расходов
                </h2>
                <div className="h-64 sm:h-80 overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#10b981" opacity={0.1} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#10b981" 
                        tick={{ fill: '#10b981', fontSize: 10 }}
                        interval="preserveStartEnd"
                        height={chartData.length > 7 ? 60 : 40}
                        tickLine={false}
                        angle={chartData.length > 7 ? -45 : 0}
                        textAnchor={chartData.length > 7 ? 'end' : 'middle'}
                      />
                      <YAxis 
                        stroke="#10b981"
                        tick={{ fill: '#10b981', fontSize: 10 }}
                        tickFormatter={(value) => `${value}₽`}
                        width={chartData.length > 7 ? 60 : 50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3, strokeWidth: 2, stroke: '#000' }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#10b981' }}
                      />
                    </LineChart>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-8">
              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Выполнено задач</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.completedTasksCount}</div>
              </div>

              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Заработано</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.stats?.totalEarned?.toFixed(0) || 0}₽</div>
              </div>

              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Средний рейтинг</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.avgRating?.toFixed(1) || '0.0'}</div>
              </div>

              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 transition">
                <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-300 text-xs sm:text-sm mb-1 sm:mb-2">
                  <Award className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Конверсия</span>
                </div>
                <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{analytics.stats?.responseRate || 0}%</div>
              </div>
            </div>

            {/* График заработка */}
            {chartData.length > 0 && (
              <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-4 sm:mb-8">
                <h2 className="text-emerald-400 text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  Динамика заработка
                </h2>
                <div className="h-64 sm:h-80 overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#10b981" opacity={0.1} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#10b981"
                        tick={{ fill: '#10b981', fontSize: 10 }}
                        interval="preserveStartEnd"
                        height={chartData.length > 7 ? 60 : 40}
                        tickLine={false}
                        angle={chartData.length > 7 ? -45 : 0}
                        textAnchor={chartData.length > 7 ? 'end' : 'middle'}
                      />
                      <YAxis 
                        stroke="#10b981"
                        tick={{ fill: '#10b981', fontSize: 10 }}
                        tickFormatter={(value) => `${value}₽`}
                        width={chartData.length > 7 ? 60 : 50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3, strokeWidth: 2, stroke: '#000' }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* Общая статистика */}
        <div className="bg-black/40 p-3 sm:p-4 md:p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <h2 className="text-emerald-400 text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Общая информация
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base text-gray-300">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-400">Дата регистрации:</span>
              <span className="sm:ml-2 text-white font-semibold mt-0.5 sm:mt-0">
                {new Date(analytics.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-400">Роль:</span>
              <span className="sm:ml-2 text-white font-semibold capitalize mt-0.5 sm:mt-0">
                {analytics.role === 'customer' ? 'Заказчик' : 'Исполнитель'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-400">Всего задач:</span>
              <span className="sm:ml-2 text-emerald-400 font-semibold mt-0.5 sm:mt-0">
                {analytics.completedTasksCount}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="text-gray-400">Средний рейтинг:</span>
              <span className="sm:ml-2 text-emerald-400 font-semibold flex items-center gap-1 mt-0.5 sm:mt-0">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-emerald-400" />
                {analytics.avgRating?.toFixed(1) || '0.0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
