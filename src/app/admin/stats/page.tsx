'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminStatsPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/admin/stats')
      const json = await res.json()
      setData(json)
    }
    fetchStats()
  }, [])

  if (!data) return <div className="text-gray-400">Загрузка...</div>

  return (
    <div className="p-8 text-gray-100">
      <h1 className="text-2xl font-bold text-emerald-400 mb-6">📊 Статистика платформы</h1>

      {/* Основные карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-black/50 border border-emerald-500/30">
          <CardContent className="p-4">
            <p className="text-gray-400">Пользователи</p>
            <p className="text-3xl text-emerald-400">{data.usersCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border border-emerald-500/30">
          <CardContent className="p-4">
            <p className="text-gray-400">Задачи</p>
            <p className="text-3xl text-emerald-400">{data.tasksCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border border-emerald-500/30">
          <CardContent className="p-4">
            <p className="text-gray-400">Отклики</p>
            <p className="text-3xl text-emerald-400">{data.responsesCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Средние цены */}
      <div className="bg-black/50 border border-emerald-500/30 p-4 rounded-xl mb-8">
        <h2 className="text-lg text-emerald-400 mb-2">💰 Минимальные ставки</h2>
        <p>Средняя: {data.subcategoriesStats._avg.minPrice.toFixed(0)} ₽</p>
        <p>Минимальная: {data.subcategoriesStats._min.minPrice} ₽</p>
        <p>Максимальная: {data.subcategoriesStats._max.minPrice} ₽</p>
      </div>

      {/* ТОП подкатегорий */}
      <div className="bg-black/50 border border-emerald-500/30 p-4 rounded-xl">
        <h2 className="text-lg text-emerald-400 mb-4">🔥 Топ подкатегорий по ставке</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.topSubcategories}>
            <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="minPrice" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
