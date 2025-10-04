'use client'

import Link from 'next/link'

export default function HomePage() {
  const W = 1920
  const H = 1080
  const px = (v: number, base: number) => `${(v / base) * 100}%`

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* фон */}
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
            top: px(34, H),
            left: px(1605, W),
            width: px(74, W),
            height: px(35, H),
          }}
        />
      </Link>

      {/* --- Регистрация --- */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(45, H),
            left: px(1690, W),
            width: px(155, W),
            height: px(35, H),
          }}
        />
      </Link>

      {/* --- Бизнес --- */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(345, H),
            left: px(560, W),
            width: px(415, W),
            height: px(72, H),
          }}
        />
      </Link>

      {/* --- Таланты --- */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(345, H),
            left: px(895, W),
            width: px(500, W),
            height: px(72, H),
          }}
        />
      </Link>
    </div>
  )
}
