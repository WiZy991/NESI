'use client'

import Link from 'next/link'

export default function HomePage() {
  const W = 1920
  const H = 1080

  const px = (v: number, base: number) => `${(v / base) * 100}%`

  // смещение
  const offsetTop = -20
  const offsetLeft = -20

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
            top: px(55 + offsetTop, H),
            left: px(1670 + offsetLeft, W),
            width: px(90, W),
            height: px(40, H),
          }}
        />
      </Link>

      {/* Регистрация */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(55 + offsetTop, H),
            left: px(1770 + offsetLeft, W),
            width: px(130, W),
            height: px(40, H),
          }}
        />
      </Link>

      {/* Бизнес */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(420 + offsetTop, H),
            left: px(530 + offsetLeft, W),
            width: px(380, W),
            height: px(150, H),
          }}
        />
      </Link>

      {/* Таланты */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer"
          style={{
            top: px(420 + offsetTop, H),
            left: px(950 + offsetLeft, W),
            width: px(380, W),
            height: px(150, H),
          }}
        />
      </Link>
    </div>
  )
}
