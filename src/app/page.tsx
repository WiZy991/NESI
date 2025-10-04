'use client'

import { useState } from 'react'
import NessiSVG from '@/components/NessiSVG'

export default function HomePage() {
  const [modal, setModal] = useState<'business' | 'talents' | null>(null)

  return (
    <main className="relative min-h-screen bg-black text-white">
      <NessiSVG
        onBusinessClick={() => setModal('business')}
        onTalentsClick={() => setModal('talents')}
      />

      {modal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-[#0d0d0d] border border-emerald-500 p-6 rounded-lg shadow-xl max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {modal === 'business' && (
              <>
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">Для заказчиков</h2>
                <ul className="list-disc pl-5 text-gray-200 space-y-2">
                  <li>Быстрый поиск специалистов</li>
                  <li>Прямые отклики</li>
                  <li>Сертификация исполнителей</li>
                  <li>Гибкая система задач и статусов</li>
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
    </main>
  )
}
