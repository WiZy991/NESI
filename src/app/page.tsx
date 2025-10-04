'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Фон */}
      <img
        src="/nessi.svg"
        alt="Nessi Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* --- Вход --- */}
      <Link href="/login" aria-label="Вход">
        <div className="absolute top-[42px] right-[125px] w-[70px] h-[35px] cursor-pointer bg-transparent hover:bg-white/10" />
      </Link>

      {/* --- Регистрация --- */}
      <Link href="/register" aria-label="Регистрация">
        <div className="absolute top-[42px] right-[40px] w-[80px] h-[35px] cursor-pointer bg-transparent hover:bg-white/10" />
      </Link>

      {/* --- Бизнес --- */}
      <Link href="/business" aria-label="Бизнес">
        <div className="absolute top-[300px] left-[580px] w-[200px] h-[90px] cursor-pointer bg-transparent hover:bg-white/10" />
      </Link>

      {/* --- Таланты --- */}
      <Link href="/talents" aria-label="Таланты">
        <div className="absolute top-[300px] left-[840px] w-[200px] h-[90px] cursor-pointer bg-transparent hover:bg-white/10" />
      </Link>
    </div>
  )
}
