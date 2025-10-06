'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { login } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (res.ok) {
      login(data.user, data.token)
      toast.success('Вы успешно вошли!')

      if (data.user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/tasks')
      }
    } else {
      toast.error(data.error || 'Ошибка входа')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-[#02150F] to-[#04382A] px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-black/40 border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] p-8 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-emerald-400 text-center mb-6">Вход</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-4"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-3 bg-black/60 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 mb-6"
        />

        <button
          type="submit"
          className="w-full py-3 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold"
        >
          Войти
        </button>

        <p className="text-sm text-center mt-6 text-gray-400">
          Забыли пароль?{' '}
          <a href="/forgot-password" className="text-emerald-400 hover:underline">
            Восстановить доступ
          </a>
        </p>
      </form>

      <Link href="/tasks" className="mt-6 inline-block text-emerald-400 hover:underline">
        ← Назад к задачам
      </Link>
    </div>
  )
}
