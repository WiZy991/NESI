'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="relative flex items-center justify-center min-h-screen bg-black overflow-hidden">
      <div className="relative w-full max-w-[1920px] aspect-[16/9]">
        <Image
          src="/nessi.svg"
          alt="NESI Background"
          fill
          priority
          className="object-contain"
        />

        {/* Вход */}
        <Link
          href="/login"
          className="absolute"
          style={{
            top: '4.3%',
            left: '83.9%',
            width: '3.5%',
            height: '3%',
          }}
          aria-label="Вход"
        />

        {/* Регистрация */}
        <Link
          href="/register"
          className="absolute"
          style={{
            top: '4.3%',
            left: '88.6%',
            width: '6.8%',
            height: '3%',
          }}
          aria-label="Регистрация"
        />

        {/* Бизнес */}
        <Link
          href="/business"
          className="absolute"
          style={{
            top: '32%',
            left: '26.2%',
            width: '11%',
            height: '4%',
          }}
          aria-label="Бизнес"
        />

        {/* Таланты */}
        <Link
          href="/talents"
          className="absolute"
          style={{
            top: '30%',
            left: '45.5%',
            width: '13.5%',
            height: '5%',
          }}
          aria-label="Таланты"
        />
      </div>
    </main>
  )
}
