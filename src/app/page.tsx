'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-black via-[#001a12] to-[#00281d] text-white overflow-hidden relative font-[Poppins]">

      {/* --- Фоновая змея --- */}
      <div className="absolute left-10 top-1/4 w-[460px] h-[720px] opacity-90">
        <svg viewBox="0 0 300 600" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path
            d="M250 50 Q180 100 220 200 Q260 300 150 400 Q40 500 120 580"
            stroke="#00ffcc"
            strokeWidth="10"
            fill="none"
            className="drop-shadow-[0_0_25px_#00ffcc] animate-pulse"
          />
        </svg>
      </div>

      {/* --- Хедер --- */}
      <header className="flex justify-between items-center px-16 pt-8 relative z-10">
        <div className="text-4xl font-semibold tracking-[0.2em] text-[#00ffcc] drop-shadow-[0_0_15px_#00ffcc]">NESI</div>
        <nav className="flex gap-8 text-sm">
          <Link href="/login" className="hover:text-[#00ffcc] transition-colors">Вход</Link>
          <Link href="/register" className="hover:text-[#00ffcc] transition-colors">Регистрация</Link>
        </nav>
      </header>

      {/* --- Центральный контент --- */}
      <section className="flex flex-col items-center text-center mt-20 relative z-10">
        <h2 className="text-lg text-[#00ffcc]/70 mb-4 tracking-wide">
          Платформа для заказчиков и исполнителей
        </h2>

        <h1 className="text-[96px] font-semibold tracking-[0.3em] text-[#00ffcc] drop-shadow-[0_0_30px_#00ffcc] mb-16">
          NESI
        </h1>

        <div className="flex gap-12 mb-20">
          <Link
            href="/business"
            className="bg-gradient-to-r from-[#003b2a] to-[#004c38] border border-[#00ffcc]/30 rounded-2xl px-12 py-6 text-2xl font-light hover:shadow-[0_0_30px_#00ffcc] hover:text-[#00ffcc] transition-all"
          >
            БИЗНЕС
          </Link>

          <div className="text-[#00ffcc] text-3xl font-thin">и</div>

          <Link
            href="/talents"
            className="bg-gradient-to-r from-[#003b2a] to-[#004c38] border border-[#00ffcc]/30 rounded-2xl px-12 py-6 text-2xl font-light hover:shadow-[0_0_30px_#00ffcc] hover:text-[#00ffcc] transition-all"
          >
            ТАЛАНТЫ
          </Link>
        </div>

        <p className="text-[#00ffcc]/70 tracking-[0.3em] text-sm">ОКТЯБРЬ 2025</p>
      </section>

      {/* --- Блок справа с изображениями --- */}
      <div className="absolute right-24 top-[18%] flex flex-col gap-6 w-[420px]">
        {[
          '/images/dev-night.jpg',
          '/images/designer.jpg',
          '/images/music.jpg',
          '/images/city.jpg',
        ].map((src, i) => (
          <div
            key={i}
            className="rounded-[24px] overflow-hidden border border-[#00ffcc]/20 shadow-[0_0_25px_#00ffcc20] hover:shadow-[0_0_40px_#00ffcc70] hover:scale-[1.02] transition-all"
          >
            <img src={src} alt="talent" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* --- Малые карточки снизу --- */}
      <div className="absolute left-[55%] bottom-[12%] flex gap-6 items-end">
        <div className="rounded-[24px] w-[120px] h-[120px] overflow-hidden border border-[#00ffcc]/20 shadow-[0_0_25px_#00ffcc20] hover:shadow-[0_0_40px_#00ffcc70] transition-all">
          <img src="/images/keyboard.jpg" alt="keyboard" className="w-full h-full object-cover" />
        </div>

        <div className="rounded-[28px] w-[200px] h-[200px] overflow-hidden border border-[#00ffcc]/20 shadow-[0_0_25px_#00ffcc20] hover:shadow-[0_0_40px_#00ffcc70] transition-all">
          <img src="/images/operator.jpg" alt="operator" className="w-full h-full object-cover" />
        </div>

        <div className="ml-6">
          <span className="text-[#00ffcc]/80 text-sm font-light tracking-wide">ONLINE</span>
          <div className="bg-[#003b2a] text-[#00ffcc] rounded-full px-3 py-1 text-xs mt-2 border border-[#00ffcc]/40">24 / 7</div>
        </div>
      </div>

      {/* --- Фоновые блики --- */}
      <div className="absolute w-[800px] h-[800px] bg-[#00ffcc30] rounded-full blur-[150px] left-[-200px] top-[20%]" />
      <div className="absolute w-[600px] h-[600px] bg-[#00ffcc20] rounded-full blur-[150px] right-[-100px] bottom-[10%]" />
    </main>
  )
}
