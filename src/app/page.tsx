'use client'

import Link from 'next/link'

export default function HomePage() {
  // Базовые размеры исходного макета (nessi.svg отрисован под 1920×1080)
  const W = 1920
  const H = 1080
  const pr = (v: number, base: number) => `${(v / base) * 100}%`
  const debug = false
  const dbg = debug
    ? { outline: '2px solid rgba(0,255,180,.6)', background: 'rgba(0,255,180,.08)' }
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

      {/* ВХОД */}
      <Link href="/login" aria-label="Вход">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(34, H), 
            left: pr(1605, W),
            width: pr(74, W),
            height: pr(36, H),
          }}
        />
      </Link>

      {/* РЕГИСТРАЦИЯ (подтянул ВЫШЕ и ЛЕВЕЕ) */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(34, H),
            left: pr(1692, W),
            width: pr(156, W),
            height: pr(36, H),
          }}
        />
      </Link>

      {/* БИЗНЕС */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(352, H),
            left: pr(565, W),
            width: pr(420, W),
            height: pr(72, H),
          }}
        />
      </Link>

      {/* ТАЛАНТЫ — зона ровно по слову (от Т до Ы), ПОДНЯЛ и ЛЕВЕЕ */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute z-10 cursor-pointer"
          style={{
            ...dbg,
            top: pr(352, H),
            left: pr(900, W),
            width: pr(505, W),
            height: pr(72, H),
          }}
        />
      </Link>
    </div>
  )
}
