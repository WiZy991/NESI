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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white text-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-gradient-to-b from-green-900/30 to-green-800/20 border border-green-700/50 rounded-2xl shadow-2xl shadow-green-900/40 p-10 max-w-md backdrop-blur-sm"
      >
        {/* Анимация иконки */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl mb-4"
        >
          📬
        </motion.div>

        <h1 className="text-3xl font-bold mb-4 text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]">
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
            className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition text-black font-semibold shadow-md disabled:opacity-50"
          >
            {loading ? 'Отправляем...' : 'Отправить письмо ещё раз'}
          </button>
        ) : (
          <p className="text-green-400 text-sm mt-4">
            ✅ Письмо отправлено повторно!
          </p>
        )}

        <div className="mt-8">
          <Link
            href="/login"
            className="inline-block text-green-400 hover:underline text-sm"
          >
            Вернуться к входу →
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
