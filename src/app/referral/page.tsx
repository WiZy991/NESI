'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Users, TrendingUp, Gift } from 'lucide-react'

type ReferralStats = {
  referralCode: string
  referralCount: number
  totalEarned: number
  referrals: Array<{
    id: string
    email: string
    fullName: string | null
    createdAt: string
    completedTasksCount: number
  }>
  bonuses: Array<{
    amount: number
    createdAt: string
    referralId: string
    task: { title: string }
  }>
}

export default function ReferralPage() {
  const router = useRouter()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/referral')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Ошибка загрузки')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = () => {
    if (!stats) return
    const link = `${window.location.origin}/register?ref=${stats.referralCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-300 text-lg animate-pulse">Загрузка...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Ошибка загрузки данных</div>
      </div>
    )
  }

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${stats.referralCode}`

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-400 mb-3 flex items-center justify-center gap-3">
            <Gift className="w-10 h-10" />
            Реферальная программа
          </h1>
          <p className="text-gray-300 text-lg">
            Приглашайте друзей и получайте 5% с их первых 5 задач!
          </p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
              <Users className="w-4 h-4" />
              Приглашено друзей
            </div>
            <div className="text-white text-4xl font-bold">{stats.referralCount}</div>
          </div>

          <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
              <TrendingUp className="w-4 h-4" />
              Заработано всего
            </div>
            <div className="text-white text-4xl font-bold">{stats.totalEarned.toFixed(2)}₽</div>
          </div>

          <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 text-emerald-300 text-sm mb-2">
              <Gift className="w-4 h-4" />
              Бонусов получено
            </div>
            <div className="text-white text-4xl font-bold">{stats.bonuses.length}</div>
          </div>
        </div>

        {/* Реферальная ссылка */}
        <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-8">
          <h2 className="text-emerald-400 text-xl font-bold mb-4">Ваша реферальная ссылка</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-gray-900/50 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
            />
            <button
              onClick={copyReferralLink}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
            >
              {copied ? (
                <>✓ Скопировано!</>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Скопировать
                </>
              )}
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Ваш код: <span className="text-emerald-400 font-mono font-bold text-lg">{stats.referralCode}</span>
          </p>
        </div>

        {/* Как это работает */}
        <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-8">
          <h2 className="text-emerald-400 text-xl font-bold mb-4">Как это работает?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 transition hover:border-emerald-500/40">
              <div className="text-4xl mb-2">📤</div>
              <h3 className="text-emerald-300 font-semibold mb-2">1. Поделитесь ссылкой</h3>
              <p className="text-gray-400 text-sm">
                Отправьте свою реферальную ссылку друзьям
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 transition hover:border-emerald-500/40">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="text-emerald-300 font-semibold mb-2">2. Друг регистрируется</h3>
              <p className="text-gray-400 text-sm">
                Они создают аккаунт по вашей ссылке
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 transition hover:border-emerald-500/40">
              <div className="text-4xl mb-2">💰</div>
              <h3 className="text-emerald-300 font-semibold mb-2">3. Получайте бонусы</h3>
              <p className="text-gray-400 text-sm">
                5% с их первых 5 завершенных задач
              </p>
            </div>
          </div>
        </div>

        {/* Список рефералов */}
        {stats.referrals.length > 0 && (
          <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-8">
            <h2 className="text-emerald-400 text-xl font-bold mb-4">Ваши рефералы</h2>
            <div className="space-y-3">
              {stats.referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="bg-gray-900/50 border border-emerald-500/20 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition"
                >
                  <div>
                    <div className="text-white font-semibold">
                      {ref.fullName || 'Без имени'}
                    </div>
                    <div className="text-gray-400 text-sm">{ref.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-semibold">
                      {ref.completedTasksCount} задач
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(ref.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* История бонусов */}
        {stats.bonuses.length > 0 && (
          <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <h2 className="text-emerald-400 text-xl font-bold mb-4">История бонусов</h2>
            <div className="space-y-3">
              {stats.bonuses.map((bonus, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900/50 border border-emerald-500/20 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition"
                >
                  <div className="flex-1">
                    <div className="text-emerald-400 font-semibold text-lg">+{Number(bonus.amount).toFixed(2)}₽</div>
                    <div className="text-gray-400 text-sm">{bonus.task.title}</div>
                  </div>
                  <div className="text-gray-500 text-sm whitespace-nowrap">
                    {new Date(bonus.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

