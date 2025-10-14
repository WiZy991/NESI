'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('📨 Письмо с инструкцией отправлено!')
        setEmail('')
      } else {
        toast.error(data.error || 'Ошибка восстановления')
      }
    } catch (e) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#02150F] to-[#04382A] px-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-black/40 border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] p-10 max-w-md w-full backdrop-blur-md"
      >
        {/* Заголовок */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold mb-6 text-emerald-400 text-center drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]"
        >
          Восстановление пароля
        </motion.h1>

        <p className="text-gray-300 text-center mb-8">
          Введите ваш e-mail, и мы отправим ссылку<br />для сброса пароля.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Введите ваш e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-[#0d1a17] border border-emerald-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-60"
          >
            {loading ? 'Отправляем...' : 'Отправить ссылку для сброса'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm text-emerald-400 hover:underline"
          >
            ← Вернуться к входу
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
