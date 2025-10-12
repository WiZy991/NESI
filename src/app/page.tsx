'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* сам SVG */}
      <div className="absolute inset-0">
        <svg
          viewBox="0 0 1920 1080"
          className="w-full h-full"
          dangerouslySetInnerHTML={{
            __html: `
              <!-- вставь сюда полный код из public/nessi.svg -->
            `,
          }}
        />
      </div>

      {/* кликабельные зоны поверх */}
      <Link href="/login" className="absolute" style={{
        top: '4%',
        left: '84%',
        width: '3%',
        height: '3%',
      }} />

      <Link href="/register" className="absolute" style={{
        top: '4%',
        left: '89%',
        width: '7%',
        height: '3%',
      }} />

      <Link href="/business" className="absolute" style={{
        top: '33%',
        left: '26%',
        width: '11%',
        height: '4%',
      }} />

      <Link href="/talents" className="absolute" style={{
        top: '31%',
        left: '45%',
        width: '13%',
        height: '5%',
      }} />
    </main>
  )
}
