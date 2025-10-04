'use client'

import Link from 'next/link'
import NessiSVG from '@/components/nessi.svg'

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <NessiSVG className="w-full h-full" />

      {/* Область для "Вход" */}
      <Link href="/login">
        <rect
          x="1600"
          y="50"
          width="100"
          height="40"
          fill="transparent"
          className="cursor-pointer"
        />
      </Link>

      {/* Область для "Регистрация" */}
      <Link href="/register">
        <rect
          x="1710"
          y="50"
          width="150"
          height="40"
          fill="transparent"
          className="cursor-pointer"
        />
      </Link>

      {/* Область для "Бизнес" */}
      <div
        onClick={() => alert('Информация для заказчиков')}
        className="absolute top-[330px] left-[720px] w-[180px] h-[70px] cursor-pointer"
      />

      {/* Область для "Таланты" */}
      <div
        onClick={() => alert('Информация для исполнителей')}
        className="absolute top-[330px] left-[930px] w-[180px] h-[70px] cursor-pointer"
      />
    </div>
  )
}
