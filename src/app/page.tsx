'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-[Poppins] select-none">
      {/* ===== Градиентный фон ===== */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,160,0.08)_0%,rgba(0,0,0,0.95)_100%)]" />

      {/* ===== ЗМЕЯ (из nessi.svg) ===== */}
      <svg
        viewBox="0 0 500 800"
        className="absolute left-[8%] top-[15%] w-[500px] h-[800px] opacity-90"
      >
        <path
          d="M320,140 C200,250 150,400 250,500 C350,600 200,700 180,800"
          stroke="#00ffcc"
          strokeWidth="15"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_20px_rgba(0,255,180,0.5)]"
        />
      </svg>

      {/* ===== ТЕКСТ NESI ===== */}
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-[13%] left-[18%] text-[95px] tracking-[15px] text-[#00FFAA] font-bold drop-shadow-[0_0_30px_rgba(0,255,160,0.6)]"
      >
        NESI
      </motion.h1>

      {/* ===== Подзаголовок ===== */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute top-[27%] left-[18%] text-[14px] text-[#00ffccaa] uppercase tracking-[2px]"
      >
        Платформа для заказчиков и исполнителей
      </motion.p>

      {/* ===== Блок “Бизнес” и “Таланты” ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute top-[40%] left-[18%] flex items-center gap-8"
      >
        <Link
          href="/business"
          className="px-12 py-6 text-2xl font-semibold text-[#00FFAA] bg-[#001c12] rounded-2xl border border-[#00FFAA]/30 hover:bg-[#003324] transition-all duration-300 shadow-[0_0_25px_rgba(0,255,150,0.2)]"
        >
          БИЗНЕС
        </Link>

        <span className="text-3xl text-[#00FFAA]">и</span>

        <Link
          href="/talents"
          className="px-12 py-6 text-2xl font-semibold text-[#00FFAA] bg-[#001c12] rounded-2xl border border-[#00FFAA]/30 hover:bg-[#003324] transition-all duration-300 shadow-[0_0_25px_rgba(0,255,150,0.2)]"
        >
          ТАЛАНТЫ
        </Link>
      </motion.div>

      {/* ===== Дата ===== */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-[12%] left-[18%] text-[#00ffbb] text-lg tracking-[4px]"
      >
        ОКТЯБРЬ 2025
      </motion.p>

      {/* ===== Кнопки Вход / Регистрация ===== */}
      <div className="absolute top-[5%] right-[7%] flex gap-8 text-sm font-medium">
        <Link
          href="/login"
          className="text-[#00FFAA] hover:text-white transition duration-300"
        >
          Вход
        </Link>
        <Link
          href="/register"
          className="px-6 py-2 border border-[#00FFAA]/60 rounded-full text-[#00FFAA] hover:bg-[#00FFAA]/10 hover:text-white transition duration-300"
        >
          Регистрация
        </Link>
      </div>

      {/* ===== Фото справа ===== */}
      <div className="absolute right-[8%] top-[18%] flex flex-col gap-5">
        <motion.img
          src="/photos/talent1.png"
          alt="talent"
          className="w-[320px] h-[220px] rounded-[25px] object-cover shadow-[0_0_25px_rgba(0,255,160,0.4)]"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        />
        <motion.img
          src="/photos/talent2.png"
          alt="talent"
          className="w-[320px] h-[220px] rounded-[25px] object-cover shadow-[0_0_25px_rgba(0,255,160,0.4)]"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        />
        <motion.img
          src="/photos/talent3.png"
          alt="talent"
          className="w-[320px] h-[220px] rounded-[25px] object-cover shadow-[0_0_25px_rgba(0,255,160,0.4)]"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
        />
      </div>

      {/* ===== Фото снизу ===== */}
      <div className="absolute right-[35%] bottom-[10%] flex items-end gap-8">
        <motion.img
          src="/photos/operator.png"
          alt="operator"
          className="w-[280px] h-[200px] rounded-[25px] object-cover shadow-[0_0_25px_rgba(0,255,150,0.4)]"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.3 }}
        />
        <motion.img
          src="/photos/keyboard.png"
          alt="keyboard"
          className="w-[180px] h-[180px] rounded-[25px] object-cover shadow-[0_0_25px_rgba(0,255,150,0.4)]"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.5 }}
        />
      </div>

      {/* ===== ONLINE BADGE ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute right-[18%] bottom-[10%] text-[#00FFAA] text-sm"
      >
        <div className="flex items-center gap-3">
          <span className="opacity-80">ONLINE</span>
          <span className="px-3 py-1 bg-[#00FFAA]/20 rounded-full border border-[#00FFAA]/30 text-xs">
            24/7
          </span>
        </div>
      </motion.div>
    </main>
  )
}
