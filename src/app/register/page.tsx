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
    const toastId = toast.loading('Регистрируем...')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data?.error || 'Ошибка регистрации', { id: toastId })
        setLoading(false)
        return
      }

      toast.success(
        data?.message ||
          'Регистрация прошла успешно! Проверьте почту и подтвердите адрес.',
        { id: toastId }
      )

      setTimeout(() => router.push('/check-email'), 800)
    } catch (err: any) {
      console.error('Ошибка регистрации:', err)
      toast.error('Ошибка сервера. Попробуйте позже.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 text-center animate-fadeIn"
      >
        <h1 className="text-4xl font-bold text-emerald-400 mb-4 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Регистрация
        </h1>

        <input
          type="text"
          placeholder="Имя"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-3 bg-transparent border-b border-emerald-400/50 focus:border-emerald-400 outline-none text-lg placeholder-gray-400 transition-all"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 bg-transparent border-b border-emerald-400/50 focus:border-emerald-400 outline-none text-lg placeholder-gray-400 transition-all"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-transparent border-b border-emerald-400/50 focus:border-emerald-400 outline-none text-lg placeholder-gray-400 transition-all"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'customer' | 'executor')}
          className="w-full p-3 bg-transparent border-b border-emerald-400/50 focus:border-emerald-400 outline-none text-lg text-emerald-300 transition-all"
        >
          <option value="customer">Заказчик</option>
          <option value="executor">Исполнитель</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full py-3 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        >
          {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
        </button>
      </form>

      <Link
        href="/"
        className="mt-8 inline-block text-emerald-400 hover:underline"
      >
        ← Назад
      </Link>
    </div>
  )
}
