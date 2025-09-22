'use client'

import { Suspense } from 'react'
import ResetPasswordContent from './ResetPasswordContent'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-center mt-16">Загрузка...</p>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
