'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ResetPasswordContent = dynamic(() => import('./ResetPasswordContent'), {
  ssr: false,
})

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-300 text-lg animate-pulse">Загрузка...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
