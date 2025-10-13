'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function EmailVerifiedPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/profile')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#02150F] to-[#04382A] px-4 text-white text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="bg-black/40 border border-emerald-500/40 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.4)] p-10 max-w-md w-full backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl mb-4"
        >
          🎉
        </motion.div>

        <h1 className="text-3xl font-bold mb-4 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
          Почта подтверждена!
        </h1>

        <p className="text-gray-300 mb-6 leading-relaxed">
          Ваш аккаунт активирован и готов к работе.<br />
          Добро пожаловать в систему <span className="text-emerald-400 font-semibold">NESI</span>!
        </p>

        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
          }}
          className="text-emerald-400 font-medium"
        >
          Переходим в профиль...
        </motion.div>
      </motion.div>
    </div>
  )
}
