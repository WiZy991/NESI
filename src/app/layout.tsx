// app/layout.tsx (серверный)
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import LayoutClient from './LayoutClient'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'SupportHub',
  description: 'Сервис задач между заказчиком и исполнителем',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>meta name="description" content="Тест"</head>
      <body className={`${inter.variable} antialiased`}>
        <LayoutClient>{children}</LayoutClient>
      </body>
      <head></head>
    </html>
  )
}
