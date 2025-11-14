'use client'

import { useUser } from '@/context/UserContext'
import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Props = {
  taskId: string
  authorId: string
  status: string
}

export default function TaskActions({ taskId, authorId, status }: Props) {
  const { user } = useUser()
  const router = useRouter()
  const { confirm, Dialog } = useConfirm()

  const handleEdit = () => {
    router.push(`/tasks/${taskId}/edit`)
  }

  const handleDelete = async () => {
    await confirm({
      title: 'Удаление задачи',
      message: 'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.',
      type: 'danger',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      onConfirm: async () => {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
        if (res.ok) {
          toast.success('Задача удалена')
          router.push('/tasks')
        } else {
          toast.error('Ошибка при удалении')
        }
      },
    })
  }

  // Кнопки видит только автор задачи и только если задача открыта
  if (!user || user.id !== authorId || status !== 'open') return null

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={handleEdit}
        className="bg-blue-600 px-4 py-1 rounded text-white hover:bg-blue-700"
      >
        Редактировать
      </button>
      <button
        onClick={handleDelete}
        className="bg-red-600 px-4 py-1 rounded text-white hover:bg-red-700"
      >
        Удалить
      </button>
      {Dialog}
    </div>
  )
}
