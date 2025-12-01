'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const AdminReviewsContent = dynamic(() => import('./AdminReviewsContent'), {
  ssr: false,
})

export default function AdminReviews() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-400 animate-pulse">Загрузка отзывов...</p>
      </div>
    }>
      <AdminReviewsContent />
    </Suspense>
  )
}
