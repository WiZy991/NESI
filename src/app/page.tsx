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
            top: px(45, H),
            left: px(1615, W),
            width: px(70, W),
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
            left: px(1695, W),
            width: px(150, W),
            height: px(35, H),
          }}
        />
      </Link>

      {/* --- Бизнес --- */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(420, H),
            left: px(600, W),
            width: px(200, W),
            height: px(60, H),
          }}
        />
      </Link>

      {/* --- Таланты --- */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(420, H),
            left: px(930, W),
            width: px(230, W),
            height: px(60, H),
          }}
        />
      </Link>
    </div>
  )
}
