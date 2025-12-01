'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/LoadingSpinner'

const HirePageContent = dynamic(() => import('./HirePageContent'), {
  ssr: false,
})

export default function HirePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    }>
      <HirePageContent />
    </Suspense>
  )
}
