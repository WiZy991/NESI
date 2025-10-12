'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative flex items-center justify-center min-h-screen bg-black overflow-hidden">
      <div className="relative w-full max-w-[1800px] aspect-[16/9]">
        <div
          className="absolute inset-0 w-full h-full"
          dangerouslySetInnerHTML={{
            __html: `
              ${require('fs')
                .readFileSync('public/nessi.svg', 'utf8')
                .replace(/[\n\r]+/g, '')}
            `,
          }}
        />

        {/* Кликабельные зоны */}
        <Link
          href="/login"
          className="absolute"
          style={{
            top: '4%',
            left: '84%',
            width: '3%',
            height: '3%',
          }}
          aria-label="Вход"
        />

        <Link
          href="/register"
          className="absolute"
          style={{
            top: '4%',
            left: '89.5%',
            width: '7%',
            height: '3%',
          }}
          aria-label="Регистрация"
        />

        <Link
          href="/business"
          className="absolute"
          style={{
            top: '32%',
            left: '26%',
            width: '11%',
            height: '4%',
          }}
          aria-label="Бизнес"
        />

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
