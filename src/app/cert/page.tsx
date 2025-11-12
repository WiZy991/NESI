'use client'

import { Suspense } from 'react'
import CertPageContent from './CertPageContent'
import { SkeletonLoader } from '@/components/SkeletonLoader'

function CertPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <SkeletonLoader height={40} rounded="lg" className="w-64 mb-4" />
          <SkeletonLoader height={24} rounded="md" className="w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-black/40 rounded-xl p-6 border border-emerald-500/20 animate-pulse">
              <SkeletonLoader height={32} rounded="md" className="w-3/4 mb-4" />
              <SkeletonLoader height={20} rounded="md" className="w-full mb-2" />
              <SkeletonLoader height={20} rounded="md" className="w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<CertPageSkeleton />}>
      <CertPageContent />
    </Suspense>
  )
}
