'use client'

import Link from 'next/link'

export default function HomePage() {
  const W = 1920
  const H = 1080
  const pr = (v: number, base: number) => `${(v / base) * 100}%`

  const debug = false
  const dbg = debug
    ? { outline: '2px solid red', background: 'rgba(255,0,0,0.2)' }
    : undefined

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Фон */}
      <img
        src="/nessi.svg"
        alt="Nessi Background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ pointerEvents: 'none' }}
      />

      {/* --- ВХОД --- */}
      <Link href="/login" aria-label="Вход">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(30, H),
            left: pr(1622, W),
            width: pr(84, W),
            height: pr(34, H),
          }}
        />
      </Link>

      {/* --- РЕГИСТРАЦИЯ --- */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(30, H),
            left: pr(1716, W),
            width: pr(160, W),
            height: pr(34, H),
          }}
        />
      </Link>

      {/* --- БИЗНЕС --- */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(378, H),
            left: pr(600, W),
            width: pr(350, W),
            height: pr(60, H),
          }}
        />
      </Link>

      {/* --- ТАЛАНТЫ --- */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(378, H),
            left: pr(1025, W),
            width: pr(450, W),
            height: pr(60, H),
          }}
        />
      </Link>
    </div>
  )
}
