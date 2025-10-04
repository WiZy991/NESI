'use client'

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Центрируем «рамку» 16:9, чтобы svg + клики масштабировались без обрезки */}
      <div className="absolute inset-0 grid place-items-center">
        {/* Рамка с базовой системой координат 1920×1080 */}
        <div
          className="relative"
          style={{
            // ширина = min(ширина окна, высота окна * 16/9)
            width: 'min(100vw, calc(100vh * (16 / 9)))',
            // держим точное соотношение
            aspectRatio: '16 / 9',
          }}
        >
          {/* Сам фон (svg) — растягиваем идеально под рамку, без обрезки */}
          <img
            src="/nessi.svg"
            alt="Nessi background"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ pointerEvents: 'none' }}
          />

          {/* === Кликабельные области (проценты от 1920×1080) === */}
          {/* ВХОД — смещено ВПРАВО на 40px ( + 2.0833% от 1920 ) */}
          <a
            aria-label="Вход"
            href="/login"
            className="absolute z-10"
            style={{
              top: '2.5%',            // как в твоём последнем варианте
              left: `${84 + 2.0833}%`, // 84% + 2.0833% ≈ 86.0833%
              width: '2.8%',
              height: '2.5%',
            }}
          />

          {/* РЕГИСТРАЦИЯ — смещено ВПРАВО на 40px */}
          <a
            aria-label="Регистрация"
            href="/register"
            className="absolute z-10"
            style={{
              top: '2.5%',
              left: `${89.6 + 2.0833}%`, // 89.6% + 2.0833% ≈ 91.6833%
              width: '6.8%',
              height: '2.5%',
            }}
          />

          {/* БИЗНЕС — смещено ВЛЕВО на 40px ( - 2.0833% от 1920 ) */}
          <a
            aria-label="Бизнес"
            href="/business"
            className="absolute z-10"
            style={{
              top: '32%',
              left: `${26.2 - 2.0833}%`, // 26.2% - 2.0833% ≈ 24.1167%
              width: '11%',
              height: '4%',
            }}
          />

          {/* ТАЛАНТЫ — смещено ВЛЕВО на 40px */}
          <a
            aria-label="Таланты"
            href="/talents"
            className="absolute z-10"
            style={{
              top: '30%',
              left: `${45.5 - 2.0833}%`, // 45.5% - 2.0833% ≈ 43.4167%
              width: '13.5%',
              height: '5.2%',
            }}
          />
        </div>
      </div>
    </main>
  )
}
