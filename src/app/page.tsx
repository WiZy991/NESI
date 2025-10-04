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
        <div
          className="absolute cursor-pointer bg-transparent"
          style={{
            top: "3.9%",   // около 42px от 1080
            right: "6.5%", // около 125px от 1920
            width: "3.6%", // 70px от 1920
            height: "3.2%" // 35px от 1080
          }}
        />
      </Link>

      {/* --- Регистрация --- */}
      <Link href="/register" aria-label="Регистрация">
        <div
          className="absolute cursor-pointer bg-transparent"
          style={{
            top: "3.9%",
            right: "2%",
            width: "5%",   // увеличил для наглядности
            height: "3.2%"
          }}
        />
      </Link>

      {/* --- Бизнес --- */}
      <Link href="/business" aria-label="Бизнес">
        <div
          className="absolute cursor-pointer bg-transparent"
          style={{
            top: "43%",     // подогнано ближе к слову
            left: "32%",    // сдвинуто левее
            width: "12%",   // ширина блока
            height: "9%"    // высота
          }}
        />
      </Link>

      {/* --- Таланты --- */}
      <Link href="/talents" aria-label="Таланты">
        <div
          className="absolute cursor-pointer bg-transparent"
          style={{
            top: "43%",
            left: "48%",    // сдвинуто правее
            width: "12%",
            height: "9%"
          }}
        />
      </Link>
    </div>
  )
}
