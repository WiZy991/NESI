'use client'

import Link from 'next/link'
import { Suspense } from 'react'

function NotFoundContent() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-[#02150F] to-[#04382A]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-emerald-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-6">
          Страница не найдена
        </h2>
        <p className="text-gray-400 mb-8 max-w-md">
          К сожалению, запрашиваемая страница не существует или была перемещена.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-300 text-lg animate-pulse">Загрузка...</div>
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  )
}

