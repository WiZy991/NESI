'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Фон */}
      <img
        src="/nessi.svg"
        alt="Nessi Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* --- Вход --- */}
      <Link href="/login" aria-label="Вход">
        <div className="absolute cursor-pointer bg-transparent hover:bg-white/10"
          style={{
            top: "3.9%",   // 42px от 1080
            right: "6.5%", // 125px от 1920
            width: "3.6%", // 70px от 1920
            height: "3.2%" // 35px от 1080
          }}
        />
      </Link>

      {/* --- Регистрация --- */}
      <Link href="/register" aria-label="Регистрация">
        <div className="absolute cursor-pointer bg-transparent hover:bg-white/10"
          style={{
            top: "3.9%",    // 42px
            right: "2%",    // 40px
            width: "4.2%",  // 80px
            height: "3.2%"  // 35px
          }}
        />
      </Link>

      {/* --- Бизнес --- */}
      <Link href="/business" aria-label="Бизнес">
        <div className="absolute cursor-pointer bg-transparent hover:bg-white/10"
          style={{
            top: "28%",     // 300px от 1080
            left: "30.2%",  // 580px от 1920
            width: "10.4%", // 200px
            height: "8.3%"  // 90px
          }}
        />
      </Link>

      {/* --- Таланты --- */}
      <Link href="/talents" aria-label="Таланты">
        <div className="absolute cursor-pointer bg-transparent hover:bg-white/10"
          style={{
            top: "28%",     // 300px
            left: "43.7%",  // 840px
            width: "10.4%", // 200px
            height: "8.3%"  // 90px
          }}
        />
      </Link>
    </div>
  )
}
