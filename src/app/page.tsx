'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* SVG как фон */}
      <img
        src="/nessi.svg"
        alt="Nessi Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Вход */}
      <Link href="/login">
        <div className="absolute top-[50px] right-[180px] w-[100px] h-[40px] cursor-pointer" />
      </Link>

      {/* Регистрация */}
      <Link href="/register">
        <div className="absolute top-[50px] right-[40px] w-[150px] h-[40px] cursor-pointer" />
      </Link>

      {/* Бизнес */}
      <Link href="/business">
        <div className="absolute top-[330px] left-[720px] w-[180px] h-[70px] cursor-pointer" />
      </Link>

      {/* Таланты */}
      <Link href="/talents">
        <div className="absolute top-[330px] left-[930px] w-[180px] h-[70px] cursor-pointer" />
      </Link>
    </div>
  )
}
