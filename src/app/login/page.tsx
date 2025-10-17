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

      if (data.user.role === 'admin') router.push('/admin')
      else router.push('/tasks')
    } else {
      toast.error(data.error || 'Ошибка входа')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white">
      <div className="w-full max-w-md p-8 border border-emerald-500/40 rounded-2xl backdrop-blur-md bg-black/10 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
        <h1 className="text-4xl font-bold text-emerald-400 text-center mb-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Вход
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 bg-transparent border border-emerald-400/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 bg-transparent border border-emerald-400/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />

          <button
            type="submit"
            className="w-full py-3 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          >
            Войти
          </button>

          <p className="text-sm text-center mt-6 text-gray-400">
            Забыли пароль?{' '}
            <Link href="/forgot-password" className="text-emerald-400 hover:underline">
              Восстановить доступ
            </Link>
          </p>
        </form>

        <div className="text-center mt-8">
          <Link href="/" className="text-emerald-400 hover:underline">
            ← Назад
          </Link>
        </div>
      </div>
    </div>
  )
}
