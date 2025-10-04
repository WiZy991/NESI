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

      {/* Вход */}
      <Link href="/login" aria-label="Вход">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(50, H),       // было выше
            left: px(1620, W),    // чуть левее
            width: px(90, W),
            height: px(45, H),
          }}
        />
      </Link>

      {/* Регистрация */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(50, H),
            left: px(1720, W),    // смещено левее
            width: px(140, W),
            height: px(45, H),
          }}
        />
      </Link>

      {/* Бизнес */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(360, H),      // поднял (было 420)
            left: px(520, W),     // немного левее
            width: px(300, W),    // сузил под блок
            height: px(100, H),   // уменьшил высоту
          }}
        />
      </Link>

      {/* Таланты */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(360, H),
            left: px(880, W),     // сдвиг левее
            width: px(300, W),
            height: px(100, H),
          }}
        />
      </Link>
    </div>
  )
}
