'use client'

import React from 'react'
import Link from 'next/link'
import { useUser } from '@/context/UserContext'
import AssignExecutorButton from './AssignExecutorButton'

type Props = {
  responses: {
    id: string
    message: string
    user: {
      id: string
      fullName: string | null
      email: string
    }
  }[]
  taskId: string
  customerId: string
  taskStatus: string
}

export default function TaskResponsesList({
  responses,
  taskId,
  customerId,
  taskStatus,
}: Props) {
  const { user, loading } = useUser()

  if (loading) return null
  const isCustomer = user?.id === customerId && user.role === 'customer'
  const canAssign = taskStatus === 'open' && isCustomer

  if (!responses.length) {
    return (
      <div className="mt-6 text-sm text-gray-400">
        Пока нет откликов на эту задачу.
      </div>
    )
  }

  return (
    <div className="mt-6 border-t border-gray-700 pt-4">
      <h2 className="text-lg font-semibold mb-2">Отклики</h2>
      {responses.map((res) => (
        <div
          key={res.id}
          className="mb-4 border border-gray-600 p-3 rounded flex justify-between items-center"
        >
          <div>
            <Link
              href={`/users/${res.user.id}`}
              className="font-semibold text-blue-400 hover:underline"
            >
              {res.user.fullName || res.user.email}
            </Link>
            <p className="text-sm text-gray-300 mt-1">{res.message}</p>
          </div>

          {canAssign && (
            <AssignExecutorButton
              taskId={taskId}
              executorId={res.user.id}
              currentUserId={user.id}
            />
          )}
        </div>
      ))}
    </div>
  )
}
