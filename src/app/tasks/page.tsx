'use client'

import { Suspense } from 'react'
import TaskCatalogPage from './TaskCatalogPage'
import { TaskCardSkeleton } from '@/components/SkeletonLoader'

function TasksPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="h-10 w-64 bg-slate-700/50 rounded-md animate-pulse mb-4" />
        <div className="h-6 w-96 bg-slate-700/50 rounded-md animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<TasksPageSkeleton />}>
      <TaskCatalogPage />
    </Suspense>
  )
}
