'use client'

import { Suspense } from 'react'
import TaskCatalogPage from './TaskCatalogPage'

export default function Page() {
  return (
    <Suspense fallback={<p className="text-center mt-16">Загрузка задач...</p>}>
      <TaskCatalogPage />
    </Suspense>
  )
}
