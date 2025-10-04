'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">
      <div className="relative z-10 w-full px-0 py-0 animate-fade-in">
        <div className="relative w-full h-screen overflow-hidden">
          <img
            src="/nessi.svg"
            alt="Nessi Background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ pointerEvents: 'none' }}
          />

          {/* ВХОД */}
          <a aria-label="Вход" href="/login">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: '4.1%',
                left: '80.5%',
                width: '6%',
                height: '3.2%',
              }}
            />
          </a>

          {/* РЕГИСТРАЦИЯ */}
          <a aria-label="Регистрация" href="/register">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: '4.1%',
                left: '87.3%',
                width: '9%',
                height: '3.2%',
              }}
            />
          </a>

          {/* БИЗНЕС */}
          <a aria-label="Бизнес" href="/business">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: '29.5%',
                left: '31.5%',
                width: '18.5%',
                height: '7.2%',
              }}
            />
          </a>

          {/* ТАЛАНТЫ */}
          <a aria-label="Таланты" href="/talents">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: '29.5%',
                left: '53.7%',
                width: '23.5%',
                height: '7.2%',
              }}
            />
          </a>
        </div>
      </div>
    </main>
  )
}
