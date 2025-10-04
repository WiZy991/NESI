'use client'

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Фон на весь экран */}
      <img
        src="/nessi.svg"
        alt="Nessi Background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          pointerEvents: 'none',
        }}
      />

      {/* Слой с кнопками */}
      <div className="relative z-10 w-full h-screen overflow-hidden">
        {/* ВХОД */}
        <a aria-label="Вход" href="/login">
          <div
            className="absolute z-10 cursor-pointer"
            style={{
              top: '2.5%',
              left: '86.1%',
              width: '2.8%',
              height: '2.5%',
            }}
          />
        </a>

        {/* РЕГИСТРАЦИЯ */}
        <a aria-label="Регистрация" href="/register">
          <div
            className="absolute z-10 cursor-pointer"
            style={{
              top: '2.5%',
              left: '91.7%',
              width: '6.8%',
              height: '2.5%',
            }}
          />
        </a>

        {/* БИЗНЕС */}
        <a aria-label="Бизнес" href="/business">
          <div
            className="absolute z-10 cursor-pointer"
            style={{
              top: '32%',
              left: '24.1%',
              width: '11%',
              height: '4%',
            }}
          />
        </a>

        {/* ТАЛАНТЫ */}
        <a aria-label="Таланты" href="/talents">
          <div
            className="absolute z-10 cursor-pointer"
            style={{
              top: '30%',
              left: '43.4%',
              width: '13.5%',
              height: '5.2%',
            }}
          />
        </a>
      </div>

      {/* Глобальные стили адаптива для разных мониторов */}
      <style jsx global>{`
        img[alt='Nessi Background'] {
          transform-origin: center;
        }

        /* Full HD */
        @media (max-width: 1920px) {
          img[alt='Nessi Background'] {
            transform: scale(0.9);
          }
        }

        /* 2K */
        @media (min-width: 1921px) and (max-width: 2560px) {
          img[alt='Nessi Background'] {
            transform: scale(0.95);
          }
        }

        /* 4K */
        @media (min-width: 2561px) {
          img[alt='Nessi Background'] {
            transform: scale(1);
          }
        }
      `}</style>
    </main>
  )
}
