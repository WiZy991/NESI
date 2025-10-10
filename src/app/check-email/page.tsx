'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white text-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-b from-green-900/30 to-green-800/20 border border-green-700/50 rounded-2xl shadow-xl p-10 max-w-md"
      >
        <h1 className="text-3xl font-bold mb-4 text-green-400">📩 Проверьте почту</h1>
        <p className="text-gray-300 mb-6">
          Мы отправили письмо с подтверждением на ваш адрес.  
          Перейдите по ссылке в письме, чтобы активировать аккаунт.
        </p>
        <p className="text-sm text-gray-500">
          Если письма нет во входящих — проверьте папку <strong>«Спам»</strong>.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-block text-green-400 hover:underline text-sm"
        >
          Вернуться к входу →
        </Link>
      </motion.div>
    </div>
  )
}
