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
        <div
          className="absolute cursor-pointer"
          style={{
            top: `${55 / 1080 * 100}%`,    // 55px от верха
            left: `${1670 / 1920 * 100}%`, // 1670px от левого края
            width: `${90 / 1920 * 100}%`,  // 90px ширина
            height: `${40 / 1080 * 100}%`  // 40px высота
          }}
        />
      </Link>

      {/* --- Регистрация --- */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute cursor-pointer"
          style={{
            top: `${55 / 1080 * 100}%`,
            left: `${1770 / 1920 * 100}%`,
            width: `${130 / 1920 * 100}%`,
            height: `${40 / 1080 * 100}%`
          }}
        />
      </Link>

      {/* --- Бизнес --- */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer"
          style={{
            top: `${420 / 1080 * 100}%`,
            left: `${530 / 1920 * 100}%`,
            width: `${380 / 1920 * 100}%`,
            height: `${150 / 1080 * 100}%`
          }}
        />
      </Link>

      {/* --- Таланты --- */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer"
          style={{
            top: `${420 / 1080 * 100}%`,
            left: `${950 / 1920 * 100}%`,
            width: `${380 / 1920 * 100}%`,
            height: `${150 / 1080 * 100}%`
          }}
        />
      </Link>
    </div>
  )
}
