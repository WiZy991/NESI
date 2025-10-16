'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'

export default function CheckEmailPage() {
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)

  const resendEmail = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
      if (res.ok) {
        setResent(true)
      } else {
        alert('Не удалось отправить письмо. Попробуйте позже.')
      }
    } catch (e) {
      console.error(e)
      alert('Ошибка соединения с сервером.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#02150F] to-[#04382A] px-4 text-white text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-black/40 border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] p-10 max-w-md w-full backdrop-blur-md"
      >
        {/* Иконка */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl mb-4"
        >
          📬
        </motion.div>

        <h1 className="text-3xl font-bold mb-4 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Проверьте почту
        </h1>

        <p className="text-gray-300 mb-6 leading-relaxed">
          Мы отправили письмо с подтверждением на ваш адрес.<br />
          Перейдите по ссылке в письме, чтобы активировать аккаунт.
        </p>

        <p className="text-sm text-gray-500 mb-8">
          Если письма нет во входящих — проверьте папку <strong>«Спам»</strong>.
        </p>

        {!resent ? (
          <button
            onClick={resendEmail}
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-black font-semibold shadow-md disabled:opacity-50"
          >
            {loading ? 'Отправляем...' : 'Отправить письмо ещё раз'}
          </button>
        ) : (
          <p className="text-emerald-400 text-sm mt-4">
            ✅ Письмо отправлено повторно!
          </p>
        )}

        <div className="mt-8">
          <Link
            href="/login"
            className="inline-block text-emerald-400 hover:underline text-sm"
          >
            Вернуться к входу →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
