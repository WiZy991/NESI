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

      setTimeout(() => {
        router.push('/check-email')
      }, 800)
    } catch (err: any) {
      console.error('Ошибка регистрации:', err)
      toast.error('Ошибка сервера. Попробуйте позже.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white">
      <div className="w-full max-w-md p-8 border border-emerald-500/40 rounded-2xl backdrop-blur-md bg-black/10 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
        <h1 className="text-4xl font-bold text-emerald-400 text-center mb-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Регистрация
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            placeholder="Имя"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-3 bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-transparent border border-emerald-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
          />

          {/* 🔽 Стилизованный SELECT */}
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'customer' | 'executor')}
              className="w-full p-3 bg-black/30 border border-emerald-400/50 rounded-lg text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition appearance-none relative cursor-pointer"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(0,255,150,0.1), rgba(0,255,150,0.05))," +
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%2310b981' viewBox='0 0 20 20'><path d='M10 12l-5-5h10l-5 5z'/></svg>\")",
                backgroundRepeat: 'no-repeat, no-repeat',
                backgroundPosition: 'right 0.75rem center, 0 0',
                backgroundSize: '1.2rem auto, 100%',
              }}
            >
              <option
                value="customer"
                className="bg-[#00140D] text-emerald-200 hover:bg-emerald-500/20"
              >
                Заказчик
              </option>
              <option
                value="executor"
                className="bg-[#00140D] text-emerald-200 hover:bg-emerald-500/20"
              >
                Исполнитель
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition font-semibold shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-60"
          >
            {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
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
