'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <main className="relative flex items-center justify-center w-full h-screen overflow-hidden bg-gradient-to-b from-black via-[#020C09] to-[#041B15] text-white font-[Poppins]">
      {/* Основной контейнер */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Фоновый градиент и свечение */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,170,0.1),rgba(0,0,0,0.95))]" />

        {/* Левая часть — логотип, текст, кнопки */}
        <div className="absolute top-[12%] left-[8%] max-w-[40%]">
          <h1 className="text-6xl font-bold text-[#00FFCD] drop-shadow-[0_0_25px_rgba(0,255,170,0.4)] mb-4">
            NESI
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed mb-10">
            Система, объединяющая таланты и бизнес.<br />
            Платформа, где каждый находит возможности.
          </p>

          <div className="flex gap-6">
            <Link
              href="/business"
              className="px-8 py-3 rounded-full bg-[#00FFCD]/20 border border-[#00FFCD]/40 hover:bg-[#00FFCD]/30 transition duration-300 text-[#00FFCD] font-semibold shadow-[0_0_15px_rgba(0,255,150,0.3)]"
            >
              Бизнес
            </Link>
            <Link
              href="/talents"
              className="px-8 py-3 rounded-full bg-[#00FFCD]/20 border border-[#00FFCD]/40 hover:bg-[#00FFCD]/30 transition duration-300 text-[#00FFCD] font-semibold shadow-[0_0_15px_rgba(0,255,150,0.3)]"
            >
              Таланты
            </Link>
          </div>
        </div>

        {/* Правая часть — изображения */}
        <div className="absolute right-[5%] top-[10%] flex flex-col gap-8 items-center">
          <motion.img
            src="/photos/operator.png"
            alt="operator"
            className="w-[480px] drop-shadow-[0_0_25px_rgba(0,255,200,0.25)]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
          />
          <motion.img
            src="/photos/keyboard.png"
            alt="keyboard"
            className="w-[400px] opacity-80"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          />
        </div>

        {/* Навигация — вход и регистрация */}
        <div className="absolute top-[4%] right-[5%] flex gap-8 text-sm font-medium">
          <Link
            href="/login"
            className="text-[#00FFCD] hover:text-white transition duration-300"
          >
            Вход
          </Link>
          <Link
            href="/register"
            className="text-[#00FFCD] hover:text-white transition duration-300 border border-[#00FFCD]/50 px-4 py-1 rounded-full hover:bg-[#00FFCD]/10"
          >
            Регистрация
          </Link>
        </div>

        {/* Glow-эффект вокруг центра */}
        <div className="absolute w-[1200px] h-[1200px] bg-[radial-gradient(circle,rgba(0,255,170,0.08)_0%,rgba(0,0,0,0)_70%)] blur-3xl" />
      </motion.div>
    </main>
  )
}
