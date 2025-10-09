'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden">
      {/* 🌌 Фоновые эффекты */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/30 to-black" />
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.3)_0%,transparent_70%)]" />

      {/*Центральный контент */}
      <motion.section
        className="relative z-10 flex flex-col items-center text-center px-4 sm:px-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        {/* ЛОГОТИП */}
        <motion.h1
          className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-widest mb-6 text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2 }}
        >
          NESI
        </motion.h1>

        {/* СЛОГАН */}
        <motion.p
          className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-2xl mb-12 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Платформа, соединяющая <span className="text-emerald-400">таланты</span> и{' '}
          <span className="text-emerald-400">бизнес</span>.  
          Работай. Развивайся. Зарабатывай.
        </motion.p>

        {/* КНОПКИ */}
        <motion.div
          className="flex flex-wrap justify-center gap-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <Link
            href="/login"
            className="px-8 py-3 text-lg rounded-xl font-semibold text-black bg-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:bg-emerald-300 transition"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 text-lg rounded-xl font-semibold border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition"
          >
            Регистрация
          </Link>
        </motion.div>
      </motion.section>

      {/*Нижний блок */}
      <motion.footer
        className="absolute bottom-10 text-sm text-gray-500 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <div className="mb-2 flex flex-wrap gap-3 justify-center">
          <Link href="/business" className="hover:text-emerald-400 transition">
            Для бизнеса
          </Link>
          <span>•</span>
          <Link href="/talents" className="hover:text-emerald-400 transition">
            Для талантов
          </Link>
        </div>
        <p>© {new Date().getFullYear()} NESI. Все права защищены.</p>
      </motion.footer>

      {/*Декоративные “светящиеся линии” */}
      <motion.div
        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </main>
  )
}
