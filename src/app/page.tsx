'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B0B0B] via-[#04150F] to-[#08382A] text-white font-[Poppins]">
      <header className="absolute top-6 right-10 flex items-center gap-8 text-sm md:text-base font-medium tracking-wide">
        <Link
          href="/login"
          className="relative hover:text-emerald-400 transition-colors duration-300 group"
        >
          Вход
          <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-emerald-400 group-hover:w-full transition-all duration-300" />
        </Link>
        <Link
          href="/register"
          className="relative hover:text-emerald-400 transition-colors duration-300 group"
        >
          Регистрация
          <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-emerald-400 group-hover:w-full transition-all duration-300" />
        </Link>
      </header>

      {/* Контент */}
      <section className="text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.4)] mb-4"
        >
          NESI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-gray-300 text-lg md:text-xl mb-16"
        >
          Платформа для заказчиков и исполнителей
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col md:flex-row items-center justify-center gap-8"
        >
          <Link
            href="/business"
            className="px-8 py-3 border border-emerald-400 text-emerald-400 rounded-xl hover:bg-emerald-400 hover:text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 text-lg font-semibold"
          >
            Бизнес
          </Link>
          <Link
            href="/talents"
            className="px-8 py-3 border border-emerald-400 text-emerald-400 rounded-xl hover:bg-emerald-400 hover:text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 text-lg font-semibold"
          >
            Таланты
          </Link>
        </motion.div>
      </section>

      {/* Легкое свечение вокруг */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] pointer-events-none" />
    </main>
  )
}
