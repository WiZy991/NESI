'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <img
        src="/nessi.svg"
        alt="Nessi Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Кнопка Вход */}
      <Link
        href="/login"
        className="absolute top-[50px] right-[180px] px-4 py-2 border border-emerald-400 text-emerald-400 rounded-md hover:bg-emerald-400 hover:text-black transition"
      >
        Вход
      </Link>

      {/* Кнопка Регистрация */}
      <Link
        href="/register"
        className="absolute top-[50px] right-[40px] px-4 py-2 border border-emerald-400 text-emerald-400 rounded-md hover:bg-emerald-400 hover:text-black transition"
      >
        Регистрация
      </Link>

      {/* Кнопка Бизнес */}
      <button
        onClick={() => alert('Информация для заказчиков')}
        className="absolute top-[300px] left-[650px] w-[160px] h-[80px] border border-emerald-400 text-emerald-400 rounded-lg hover:bg-emerald-400 hover:text-black transition"
      >
        Бизнес
      </button>

      {/* Кнопка Таланты */}
      <button
        onClick={() => alert('Информация для исполнителей')}
        className="absolute top-[300px] left-[850px] w-[160px] h-[80px] border border-emerald-400 text-emerald-400 rounded-lg hover:bg-emerald-400 hover:text-black transition"
      >
        Таланты
      </button>
    </div>
  )
}
