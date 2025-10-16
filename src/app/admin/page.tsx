'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { motion } from 'framer-motion'

export default function AdminHomePage() {
  const [me, setMe] = useState<{ email: string; role: string } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchStats = async () => {
    try {
      const [meRes, statsRes] = await Promise.all([
        fetch('/api/admin/me', { cache: 'no-store' }),
        fetch('/api/admin/stats', { cache: 'no-store' }),
      ])

      if (meRes.ok) {
        const data = await meRes.json()
        setMe(data.user)
      }

      if (statsRes.ok) {
        const json = await statsRes.json()
        setStats(json)
        setError(false)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 text-gray-100">
      <h2 className="text-2xl font-bold mb-4 text-emerald-400">
        Добро пожаловать в админ-панель
      </h2>
      {me && (
        <p className="text-sm text-gray-400 mb-6">
          Вы вошли как <b>{me.email}</b> ({me.role})
        </p>
      )}

      {loading ? (
        <p className="text-gray-400 animate-pulse">Загрузка данных...</p>
      ) : error ? (
        <p className="text-red-500">Ошибка загрузки статистики.</p>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Быстрые действия */}
          <Card className="bg-black/60 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <CardContent className="p-5">
              <h3 className="font-semibold text-emerald-400 mb-3">⚡ Быстрые действия</h3>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                <li>Просмотреть новые задачи</li>
                <li>Модерировать отклики</li>
                <li>Проверить жалобы на отзывы</li>
              </ul>
            </CardContent>
          </Card>

          {/* Основная статистика */}
          <Card className="bg-black/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <CardContent className="p-5">
              <h3 className="font-semibold text-emerald-400 mb-3">📊 Статистика платформы</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <MiniStat label="Пользователи" value={stats.usersCount} />
                <MiniStat label="Задачи" value={stats.tasksCount} />
                <MiniStat label="Отклики" value={stats.responsesCount} />
                <MiniStat
                  label="Средняя ставка"
                  value={`${stats.subcategoriesStats._avg.minPrice.toFixed(0)} ₽`}
                />
              </div>

              {/* Топ подкатегорий */}
              <div className="h-[200px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topSubcategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d0d0d',
                        border: '1px solid #10b981',
                        borderRadius: '0.5rem',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="minPrice" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Рост пользователей и задач */}
          <Card className="bg-black/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <CardContent className="p-5">
              <h3 className="font-semibold text-emerald-400 mb-3">📈 Рост за последние 7 дней</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={mergeGrowth(stats.usersByDay, stats.tasksByDay)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #10b981',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    name="Пользователи"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="tasks"
                    stroke="#3b82f6"
                    name="Задачи"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Топ категорий */}
          <Card className="bg-black/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <CardContent className="p-5">
              <h3 className="font-semibold text-emerald-400 mb-3">
                🏆 Топ категорий по задачам
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topCategories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #10b981',
                      borderRadius: '0.5rem',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="tasks" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center bg-black/30 rounded-lg py-3 border border-emerald-800/30">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-emerald-400 font-bold text-lg">{value}</p>
    </div>
  )
}

function mergeGrowth(users: any[], tasks: any[]) {
  const map: Record<string, { date: string; users?: number; tasks?: number }> = {}
  users?.forEach((u: any) => (map[u.date] = { ...map[u.date], date: u.date, users: Number(u.count) }))
  tasks?.forEach((t: any) => (map[t.date] = { ...map[t.date], date: t.date, tasks: Number(t.count) }))
  return Object.values(map)
}
