'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const FinancePageContent = dynamic(() => import('./FinancePageContent'), {
  ssr: false,
})

export default function FinancePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-400 animate-pulse">Загрузка...</p>
      </div>
    }>
      <FinancePageContent />
    </Suspense>
  )
}
