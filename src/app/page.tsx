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
            top: px(35, H),        // было 55 → поднял выше
            left: px(1580, W),     // было 1670 → левее
            width: px(100, W),     // сделал чуть шире
            height: px(45, H),
          }}
        />
      </Link>

      {/* Регистрация */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(35, H),
            left: px(1700, W),     // левее
            width: px(150, W),     // шире
            height: px(45, H),
          }}
        />
      </Link>

      {/* Бизнес */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(300, H),       // было 420 → сильно выше
            left: px(480, W),      // было 530 → левее
            width: px(330, W),     // подогнал под реальный блок
            height: px(120, H),    // уменьшил высоту
          }}
        />
      </Link>

      {/* Таланты */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(300, H),
            left: px(860, W),      // было 950 → левее
            width: px(330, W),
            height: px(120, H),
          }}
        />
      </Link>
    </div>
  )
}
