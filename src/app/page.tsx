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
                top: '2.5%',
                left: '84%',
                width: '2.8%',
                height: '2.5%',
              }}
            />
          </a>

          {/* РЕГИСТРАЦИЯ */}
          <a aria-label="Регистрация" href="/register">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: '2.5%',
                left: '89.6%',
                width: '6.8%',
                height: '2.5%',
              }}
            />
          </a>

          {/* БИЗНЕС */}
          <a aria-label="Бизнес" href="/business">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: '32%',
                left: '26.2%',
                width: '11%',
                height: '4%',
              }}
            />
          </a>  

          {/* ТАЛАНТЫ */}
          <a aria-label="Таланты" href="/talents">
            <div
              className="absolute z-10 cursor-pointer"
              style={{
                top: '30%',
                left: '45.5%',
                width: '13.5%',
                height: '5.2%',
              }}
            />
          </a>
        </div>
      </div>
    </main>
  )
}
