'use client'

import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FaPython, FaJs, FaDatabase, FaGlobe, FaToolbox, FaUserCircle } from 'react-icons/fa'
import Onboarding from '@/components/Onboarding'  // ← добавил импорт

type Review = {
  id: string
  rating: number
  comment: string
  createdAt: string
  task: { title: string }
  fromUser: { fullName?: string; email: string }
}

type FullUser = {
  id: string
  fullName?: string
  email: string
  role: string
  description?: string
  location?: string
  skills?: string[]
  avatarUrl?: string
  balance?: number
}

const getSkillIcon = (skill: string) => {
  const lower = skill.toLowerCase()
  if (lower.includes('python')) return <FaPython className="mr-1 text-emerald-400" />
  if (lower.includes('js') || lower.includes('javascript')) return <FaJs className="mr-1 text-yellow-400" />
  if (lower.includes('sql') || lower.includes('db')) return <FaDatabase className="mr-1 text-blue-400" />
  if (lower.includes('dns') || lower.includes('network')) return <FaGlobe className="mr-1 text-indigo-400" />
  return <FaToolbox className="mr-1 text-gray-400" />
}

export default function ProfilePageContent() {
  const { user, token, loading, login } = useUser()
  const [reviews, setReviews] = useState<Review[]>([])
  const [profile, setProfile] = useState<FullUser | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [transactions, setTransactions] = useState<any[]>([])
  const [amount, setAmount] = useState(100)

  useEffect(() => {
    if (!token) return

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Ошибка загрузки профиля')
        const data = await res.json()
        setProfile(data.user)
        login(data.user, token)

        // Баланс
        const txRes = await fetch('/api/wallet/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const txData = await txRes.json()
        setTransactions(txData.transactions || [])
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [token])

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user || user.role !== 'executor') return
      try {
        const res = await fetch('/api/reviews/me', {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setReviews(data.reviews || [])
      } catch (err) {
        console.error('Ошибка загрузки отзывов:', err)
      }
    }

    fetchReviews()
  }, [user, token])

  const handleDeposit = async () => {
    await fetch('/api/wallet/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    })
    location.reload()
  }

  const handleWithdraw = async () => {
    await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    })
    location.reload()
  }

  if (loading || !user || loadingProfile || !profile) {
    return <div className="p-6 text-gray-400">Загрузка профиля...</div>
  }

  // Корректируем URL для аватара
  const avatarSrc = profile.avatarUrl
    ? profile.avatarUrl.startsWith('http')
      ? profile.avatarUrl
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${profile.avatarUrl}`
    : null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {user && <Onboarding role={user.role} />}  {/* ← добавил запуск Onboarding */}

      <h1 className="text-3xl font-bold text-emerald-400 mb-4">👤 Профиль</h1>

      {/* Аватар */}
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt="Avatar"
          className="w-28 h-28 rounded-full border-2 border-emerald-500 
                     shadow-[0_0_15px_rgba(16,185,129,0.5)] mb-4 object-cover"
        />
      ) : (
        <FaUserCircle className="text-gray-600 w-28 h-28 mb-4" />
      )}

      {/* Основная инфа */}
      <div className="bg-black/40 p-4 rounded-xl border border-emerald-500/30 
                      shadow-[0_0_15px_rgba(16,185,129,0.2)] space-y-2">
        <p><span className="text-gray-400">Имя:</span> {profile.fullName || 'Не указано'}</p>
        <p><span className="text-gray-400">Email:</span> {profile.email}</p>
        <p><span className="text-gray-400">Роль:</span> {profile.role === 'customer' ? 'Заказчик' : 'Исполнитель'}</p>
        {profile.location && <p><span className="text-gray-400">Город:</span> {profile.location}</p>}
      </div>

      {/* Баланс */}
      <div className="p-4 bg-black/40 rounded-xl border border-emerald-500/30 
                      shadow-[0_0_15px_rgba(16,185,129,0.2)]">
        <h2 className="text-lg font-semibold text-emerald-400 mb-2">💰 Баланс</h2>
        <p className="mb-2">
          Текущий баланс: <span className="text-emerald-300 font-medium">{profile.balance ?? 0} NESI</span>
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className="bg-transparent border border-emerald-500/30 text-white p-2 
                       rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 w-32"
          />
          <button onClick={handleDeposit} className="px-3 py-1 rounded border border-emerald-400 
                                                     text-emerald-400 hover:bg-emerald-400 hover:text-black transition">
            Пополнить
          </button>
          <button onClick={handleWithdraw} className="px-3 py-1 rounded border border-red-400 
                                                      text-red-400 hover:bg-red-400 hover:text-black transition">
            Вывести
          </button>
        </div>

        <h3 className="text-md font-semibold text-emerald-300 mb-2">История транзакций</h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500">Пока нет транзакций</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {transactions.map((t) => (
              <li key={t.id}>
                <span className={t.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </span>{' '}
                — {t.reason} <span className="text-gray-500">({t.type})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Навыки */}
      {profile.skills && (
        <div className="bg-black/40 p-4 rounded-xl border border-emerald-500/30 
                        shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <h2 className="text-lg font-semibold text-emerald-400 mb-2">🛠 Навыки</h2>
          <div className="flex flex-wrap gap-2 mt-1">
            {Array.isArray(profile.skills) && profile.skills.map((skill, index) => (
              <div
                key={index}
                className="flex items-center px-3 py-1 rounded-full text-sm 
                           border border-emerald-500/40 bg-black/60 
                           shadow-[0_0_8px_rgba(16,185,129,0.2)]"
              >
                {getSkillIcon(skill)}
                {skill.trim()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* О себе */}
      {profile.description && (
        <div className="bg-black/40 p-4 rounded-xl border border-emerald-500/30 
                        shadow-[0_0_15px_rgba(16,185,129,0.2)]">
        <h2 className="text-lg font-semibold text-emerald-400 mb-2">📄 О себе</h2>
        <p className="text-gray-300">{profile.description}</p>
      </div>
      )}

      {/* Кнопки */}
      <div className="flex gap-4 flex-wrap mt-4">
        <Link
          href="/profile/edit"
          className="px-4 py-2 rounded border border-emerald-400 text-emerald-400 
                     hover:bg-emerald-400 hover:text-black transition"
        >
          ✏️ Редактировать профиль
        </Link>
        <Link
          href="/level"
          className="px-4 py-2 rounded border border-indigo-400 text-indigo-400 
                     hover:bg-indigo-400 hover:text-black transition"
        >
          📊 Мой уровень
        </Link>
      </div>

      {/* Отзывы */}
      {user.role === 'executor' && (
        <div className="mt-6 border-t border-emerald-500/30 pt-6 space-y-4">
          <h2 className="text-lg font-semibold text-emerald-400">Отзывы заказчиков</h2>
          {reviews.length === 0 ? (
            <p className="text-gray-500">Пока нет отзывов</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-black/40 border border-emerald-500/30 
                                               p-4 rounded shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">{review.task.title}</span>
                    <span className="text-yellow-400 font-bold">{review.rating} ⭐</span>
                  </div>
                  <p className="italic text-gray-300 mb-1">“{review.comment}”</p>
                  <p className="text-sm text-gray-500">
                    От: {review.fromUser?.fullName || review.fromUser?.email} —{' '}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
