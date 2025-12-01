'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setMessage('Токен не найден.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()
      setMessage(data.message)

      if (res.ok) {
        setTimeout(() => router.push('/login'), 3000)
      }
    } catch (err) {
      setMessage('Ошибка соединения с сервером.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#02150F] to-[#04382A] px-4 text-white text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-black/40 border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] p-10 max-w-md w-full backdrop-blur-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          🔐 Сброс пароля
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="password"
            placeholder="Введите новый пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-emerald-950/30 border border-emerald-600/40 text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400"
          />

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-black font-semibold shadow-md disabled:opacity-50"
          >
            {loading ? 'Сохраняем...' : 'Сохранить пароль'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-emerald-300">{message}</p>
        )}
      </motion.div>
    </div>
  )
}
