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
        <div className="absolute top-[50px] right-[140px] w-[90px] h-[40px] cursor-pointer bg-transparent" />
      </Link>

      {/* --- Регистрация --- */}
      <Link href="/register" aria-label="Регистрация">
        <div className="absolute top-[50px] right-[40px] w-[130px] h-[40px] cursor-pointer bg-transparent" />
      </Link>

      {/* --- Бизнес --- */}
      <Link href="/business" aria-label="Бизнес">
        <div className="absolute top-[330px] left-[720px] w-[180px] h-[70px] cursor-pointer bg-transparent" />
      </Link>

      {/* --- Таланты --- */}
      <Link href="/talents" aria-label="Таланты">
        <div className="absolute top-[330px] left-[930px] w-[180px] h-[70px] cursor-pointer bg-transparent" />
      </Link>
    </div>
  )
}
