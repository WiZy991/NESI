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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-center p-6 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-b from-green-900/30 to-green-800/20 border border-green-700/50 rounded-2xl shadow-xl p-10 max-w-md"
      >
        <h1 className="text-3xl font-bold mb-4 text-green-400">
          🎉 Почта подтверждена!
        </h1>
        <p className="text-gray-300 mb-6">
          Ваш аккаунт активирован. Добро пожаловать в систему NESI!
        </p>

        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
          className="text-green-400 font-medium"
        >
          Переходим в профиль...
        </motion.div>
      </motion.div>
    </div>
  )
}
