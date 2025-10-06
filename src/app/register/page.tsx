'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useUser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'customer' | 'executor'>('customer')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const toastId = toast.loading('Регистрация...')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка регистрации')
      }

      const { token } = await res.json()
      localStorage.setItem('token', token)

      const userRes = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!userRes.ok) throw new Error('Ошибка при получении профиля')

      const user = await userRes.json()
      login(user, token)
      toast.success('Регистрация прошла успешно', { id: toastId })
      router.push('/profile')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сервера', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#02150F] to-[#04382A] px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-black/40 border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] p-8 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-emerald-400 text-center mb-6">Регистрация</h1>

        <input
          type="text"
          placeholder="Имя"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-3 mb-4 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'customer' | 'executor')}
          className="w-full p-3 mb-6 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="customer">Заказчик</option>
          <option value="executor">Исполнитель</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold"
        >
          {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
        </button>
      </form>

<Link href="/tasks" className="mt-6 inline-block text-emerald-400 hover:underline">
        ← Назад
      </Link>
    </div>
  )
}
