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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 text-center animate-fadeIn"
      >
        <h1 className="text-4xl font-bold text-emerald-400 mb-4 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Вход
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 bg-transparent border-b border-emerald-400/50 focus:border-emerald-400 outline-none text-lg placeholder-gray-400 transition-all"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-3 bg-transparent border-b border-emerald-400/50 focus:border-emerald-400 outline-none text-lg placeholder-gray-400 transition-all"
        />

        <button
          type="submit"
          className="mt-4 w-full py-3 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        >
          Войти
        </button>

        <p className="text-sm text-gray-400 mt-6">
          Забыли пароль?{' '}
          <Link href="/forgot-password" className="text-emerald-400 hover:underline">
            Восстановить доступ
          </Link>
        </p>
      </form>

      <Link href="/" className="mt-8 inline-block text-emerald-400 hover:underline">
        ← Назад
      </Link>
    </div>
  )
}
