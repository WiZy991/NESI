'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { toast } from 'sonner'

export default function EditTaskPage() {
  const { id } = useParams() as { id: string }
  const { token, user } = useUser()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTask = async () => {
      const res = await fetch(`/api/tasks/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!res.ok) {
        toast.error('Ошибка загрузки задачи')
        router.push('/tasks')
        return
      }

      const data = await res.json()

      if (!user || data.task.customerId !== user.id || data.task.status !== 'open') {
        toast.error('Нет доступа к редактированию')
        router.push('/tasks')
        return
      }

      setTitle(data.task.title)
      setDescription(data.task.description)
      setLoading(false)
    }

    if (id && token) fetchTask()
  }, [id, token, user, router])

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Заполни все поля')
      return
    }

    setLoading(true)

    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description }),
    })

    if (!res.ok) {
      toast.error('Ошибка при сохранении')
      setLoading(false)
      return
    }

    toast.success('Задача обновлена!')
    router.push(`/tasks/${id}`)
  }

  if (loading) return <div className="p-6">Загрузка...</div>

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Редактировать задачу</h1>

      <input
        className="w-full p-2 border bg-black text-white"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название задачи"
      />

      <textarea
        className="w-full p-2 border bg-black text-white h-32"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание задачи"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? 'Сохраняем...' : 'Сохранить'}
        </button>

        <button
          onClick={() => router.push(`/tasks/${id}`)}
          disabled={loading}
          className="px-4 py-2 rounded text-white bg-gray-600 hover:bg-gray-700"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
