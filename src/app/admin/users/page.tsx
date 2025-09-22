'use client'

import { useEffect, useState } from 'react'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      const data = await res.json()
      setUsers(data.users || [])
    }
    fetchUsers()
  }, [])

  const handleMakeAdmin = async (id: string) => {
    await fetch(`/api/admin/users/${id}/make-admin`, { method: 'POST' })
    location.reload()
  }

  const handleBlock = async (id: string) => {
    await fetch(`/api/admin/users/${id}/block`, { method: 'POST' })
    location.reload()
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Пользователи</h2>
      <table className="w-full text-sm border border-gray-700">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-2 text-left">ID</th>
            <th className="p-2">Имя</th>
            <th className="p-2">Email</th>
            <th className="p-2">Роль</th>
            <th className="p-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-700">
              <td className="p-2">{u.id}</td>
              <td className="p-2">{u.fullName || '—'}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2 space-x-2">
                {u.role !== 'admin' && (
                  <button
                    onClick={() => handleMakeAdmin(u.id)}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
                  >
                    Сделать админом
                  </button>
                )}
                <button
                  onClick={() => handleBlock(u.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                >
                  Заблокировать
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
