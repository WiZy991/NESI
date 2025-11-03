'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 text-white">
      {/* Адаптивная форма */}
      <div className="w-full max-w-md sm:max-w-lg p-6 sm:p-8 md:p-10 border border-emerald-500/40 rounded-xl sm:rounded-2xl backdrop-blur-md bg-black/10 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-400 text-center mb-6 sm:mb-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Вход
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 sm:p-4 text-base sm:text-lg bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition touch-manipulation"
          />

          {/* Пароль с глазком */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 sm:p-4 pr-12 sm:pr-14 text-base sm:text-lg bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition touch-manipulation"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-400 active:text-emerald-300 transition touch-manipulation p-1 sm:p-2"
              aria-label="Показать пароль"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>

          {/* Кнопка входа */}
          <button
            type="submit"
            className="w-full py-3 sm:py-4 text-base sm:text-lg rounded-lg border-2 border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black active:scale-95 transition-all duration-200 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)] touch-manipulation"
          >
            Войти
          </button>

          <p className="text-xs sm:text-sm text-center mt-4 sm:mt-6 text-gray-400 px-2">
            Забыли пароль?{' '}
            <Link
              href="/forgot-password"
              className="text-emerald-400 hover:text-emerald-300 underline active:text-emerald-200 transition touch-manipulation"
            >
              Восстановить доступ
            </Link>
          </p>
        </form>

        <div className="text-center mt-6 sm:mt-8">
          <Link 
            href="/" 
            className="text-emerald-400 hover:text-emerald-300 underline active:text-emerald-200 transition text-sm sm:text-base touch-manipulation inline-flex items-center gap-2"
          >
            <span>←</span> <span>Назад</span>
          </Link>
        </div>

        {/* Кнопка регистрации для мобильных */}
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-emerald-500/20 text-center">
          <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
            Нет аккаунта?
          </p>
          <Link
            href="/register"
            className="inline-block w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition-all duration-200 font-medium shadow-[0_0_10px_rgba(16,185,129,0.3)] touch-manipulation"
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  )
}
