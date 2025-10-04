'use client'
import { useState } from 'react'
import NessiSVG from '@/components/NessiSVG'

export default function HomePage() {
  const [modal, setModal] = useState<'business' | 'talents' | null>(null)

  return (
    <main className="min-h-screen bg-black">
      <NessiSVG
        onBusinessClick={() => setModal('business')}
        onTalentsClick={() => setModal('talents')}
      />

      {modal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-[#0d0d0d] border border-emerald-500 p-6 rounded-lg shadow-xl">
            {modal === 'business' && <h2 className="text-2xl text-emerald-400">Для заказчиков</h2>}
            {modal === 'talents' && <h2 className="text-2xl text-emerald-400">Для исполнителей</h2>}
            <button
              onClick={() => setModal(null)}
              className="mt-6 px-4 py-2 border border-emerald-400 hover:bg-emerald-500"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
