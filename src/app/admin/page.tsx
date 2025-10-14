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
} from 'recharts'

export default function AdminHomePage() {
  const [me, setMe] = useState<{ email: string; role: string } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        // Загружаем информацию об админе
        const res = await fetch('/api/admin/me', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setMe(data.user)
        }

        // Загружаем статистику
        const statsRes = await fetch('/api/admin/stats', { cache: 'no-store' })
        if (statsRes.ok) {
          const statsJson = await statsRes.json()
          setStats(statsJson)
        }
      } catch (err) {
        console.error('Ошибка загрузки статистики', err)
      } finally {
        setLoading(false)
      }
    }
    run()
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Статистика */}
        <Card className="bg-black/60 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <CardContent className="p-5">
            <h3 className="font-semibold text-emerald-400 mb-3">📊 Статистика платформы</h3>

            {loading && (
              <p className="text-sm text-gray-400 animate-pulse">Загрузка статистики...</p>
            )}

            {!loading && !stats && (
              <p className="text-sm text-red-400">Ошибка загрузки данных.</p>
            )}

            {stats && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <MiniStat label="Пользователи" value={stats.usersCount} />
                  <MiniStat label="Задачи" value={stats.tasksCount} />
                  <MiniStat label="Отклики" value={stats.responsesCount} />
                  <MiniStat
                    label="Средняя ставка"
                    value={`${stats.subcategoriesStats._avg.minPrice.toFixed(0)} ₽`}
                  />
                </div>

                <div className="h-[200px]">
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
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
