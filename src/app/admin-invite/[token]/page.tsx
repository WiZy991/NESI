'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/api/admin/invite/${params.token}`)
        const data = await res.json()
        if (res.ok) setStatus('valid')
        else setStatus('invalid')
      } catch {
        setStatus('invalid')
      }
    }
    check()
  }, [params.token])

  if (status === 'checking') return <p>Проверяем приглашение...</p>
  if (status === 'invalid') return <p className="text-red-400">Приглашение недействительно</p>

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-xl font-bold mb-4">Админ приглашение</h1>
      <p className="mb-4 text-gray-300">Войдите в систему, чтобы активировать права администратора.</p>
      <button
        onClick={async () => {
          const res = await fetch(`/api/admin/invite/${params.token}/accept`, { method: 'POST' })
          if (res.ok) {
            router.push('/admin')
          } else {
            alert('Ошибка при активации')
          }
        }}
        className="px-4 py-2 bg-blue-600 rounded text-white"
      >
        Принять приглашение
      </button>
    </div>
  )
}
