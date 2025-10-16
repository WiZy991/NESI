'use client'
import { Suspense } from 'react'
import ChatsPage from './page'

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Загрузка чатов...</div>}>
      <ChatsPage />
    </Suspense>
  )
}
