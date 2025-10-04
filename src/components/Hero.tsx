'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Hero() {
  const [modal, setModal] = useState<'business' | 'talents' | null>(null)

  return (
    <section className="relative w-full h-screen flex items-center justify-center bg-black">
      <div className="w-full h-full">
        <svg
          viewBox="0 0 1920 1080"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain"
        >
          {/* NESI логотип */}
          <text x="80" y="120" fontSize="80" fontWeight="bold" fill="#00ffaa">
            NESI
          </text>

          {/* Кнопка Вход */}
          <Link href="/login">
            <g className="cursor-pointer hover:opacity-80">
              <rect x="1650" y="30" width="100" height="40" rx="10" stroke="#00ffaa" />
              <text x="1700" y="58" textAnchor="middle" fontSize="18" fill="#00ffaa">
                Вход
              </text>
            </g>
          </Link>

          {/* Кнопка Регистрация */}
          <Link href="/register">
            <g className="cursor-pointer hover:opacity-80">
              <rect x="1770" y="30" width="120" height="40" rx="10" stroke="#00ffaa" />
              <text x="1830" y="58" textAnchor="middle" fontSize="18" fill="#00ffaa">
                Регистрация
              </text>
            </g>
          </Link>

          {/* Кнопка БИЗНЕС */}
          <g
            onClick={() => setModal('business')}
            className="cursor-pointer hover:opacity-80 transition"
          >
            <rect
              x="100"
              y="300"
              width="300"
              height="150"
              rx="20"
              fill="rgba(0,255,170,0.1)"
              stroke="#00ffaa"
              strokeWidth="2"
            />
            <text x="250" y="380" textAnchor="middle" fontSize="28" fill="#00ffaa">
              БИЗНЕС
            </text>
          </g>

          {/* Кнопка ТАЛАНТЫ */}
          <g
            onClick={() => setModal('talents')}
            className="cursor-pointer hover:opacity-80 transition"
          >
            <rect
              x="450"
              y="300"
              width="300"
              height="150"
              rx="20"
              fill="rgba(0,255,170,0.1)"
              stroke="#00ffaa"
              strokeWidth="2"
            />
            <text x="600" y="380" textAnchor="middle" fontSize="28" fill="#00ffaa">
              ТАЛАНТЫ
            </text>
          </g>
        </svg>
      </div>

      {/* Модалки */}
      {modal && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/70"
          onClick={() => setModal(null)}
        >
          <div
            className="max-w-lg bg-[#0d0d0d] border border-emerald-500 p-6 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {modal === 'business' && (
              <>
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">Для заказчиков</h2>
                <ul className="list-disc pl-5 text-gray-200 space-y-2">
                  <li>Быстрый поиск специалистов</li>
                  <li>Прямые отклики</li>
                  <li>Гарантия сертификации</li>
                  <li>Гибкая система статусов</li>
                </ul>
              </>
            )}
            {modal === 'talents' && (
              <>
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">Для исполнителей</h2>
                <ul className="list-disc pl-5 text-gray-200 space-y-2">
                  <li>Система роста и опыта</li>
                  <li>Сертификация навыков</li>
                  <li>Профиль и рейтинг</li>
                  <li>Подиум лучших специалистов</li>
                </ul>
              </>
            )}
            <button
              onClick={() => setModal(null)}
              className="mt-6 rounded border border-emerald-400 px-4 py-2 hover:bg-emerald-500 hover:text-black"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
