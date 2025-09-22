'use client'

import { useEffect, useState } from 'react'

export default function AdminTasks() {
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    const fetchTasks = async () => {
      const res = await fetch('/api/admin/tasks', { cache: 'no-store' })
      const data = await res.json()
      setTasks(data.tasks || [])
    }
    fetchTasks()
  }, [])

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' })
    location.reload()
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Задачи</h2>
      <table className="w-full text-sm border border-gray-700">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-2 text-left">ID</th>
            <th className="p-2">Название</th>
            <th className="p-2">Статус</th>
            <th className="p-2">Автор</th>
            <th className="p-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-t border-gray-700">
              <td className="p-2">{t.id}</td>
              <td className="p-2">{t.title}</td>
              <td className="p-2">{t.status}</td>
              <td className="p-2">{t.customer?.email}</td>
              <td className="p-2">
                <button
                  onClick={() => handleDelete(t.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
