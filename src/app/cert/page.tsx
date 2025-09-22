'use client'

import { Suspense } from 'react'
import CertPageContent from './CertPageContent'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-center mt-16">Загрузка...</p>}>
      <CertPageContent />
    </Suspense>
  )
}
