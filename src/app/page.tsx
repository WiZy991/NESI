'use client'

import Link from 'next/link'

export default function HomePage() {
  const W = 1920
  const H = 1080
  const px = (v: number, base: number) => `${(v / base) * 100}%`

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <img
        src="/nessi.svg"
        alt="Nessi Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Вход */}
      <Link href="/login" aria-label="Вход">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(15, H),
            left: px(1580, W),
            width: px(100, W),
            height: px(45, H),
          }}
        />
      </Link>

      {/* Регистрация */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(15, H),
            left: px(1700, W),
            width: px(150, W),
            height: px(45, H),
          }}
        />
      </Link>

      {/* Бизнес */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(300, H),
            left: px(480, W),
            width: px(330, W),
            height: px(120, H),
          }}
        />
      </Link>

      {/* Таланты */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(300, H),
            left: px(860, W),
            width: px(330, W),
            height: px(120, H),
          }}
        />
      </Link>
    </div>
  )
}
