'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="w-full h-screen overflow-hidden">
      <svg
        viewBox="0 0 1920 1080"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* тут твой огромный SVG-код из nessi.svg */}

        {/* Вход */}
        <Link href="/login">
          <rect
            x="1690" y="45" width="70" height="35"
            fill="transparent"
            className="cursor-pointer hover:fill-white/10"
          />
        </Link>

        {/* Регистрация */}
        <Link href="/register">
          <rect
            x="1780" y="45" width="100" height="35"
            fill="transparent"
            className="cursor-pointer hover:fill-white/10"
          />
        </Link>

        {/* Бизнес */}
        <Link href="/business">
          <rect
            x="580" y="300" width="200" height="90"
            fill="transparent"
            className="cursor-pointer hover:fill-white/10"
          />
        </Link>

        {/* Таланты */}
        <Link href="/talents">
          <rect
            x="840" y="300" width="200" height="90"
            fill="transparent"
            className="cursor-pointer hover:fill-white/10"
          />
        </Link>
      </svg>
    </div>
  )
}
