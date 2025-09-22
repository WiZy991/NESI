'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('Неверная или устаревшая ссылка')
      router.push('/login')
    }
  }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Пароли не совпадают')
      return
    }

    setSubmitting(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (res.ok) {
      toast.success('Пароль успешно обновлён!')
      router.push('/login')
    } else {
      toast.error(data.message || 'Ошибка сохранения пароля')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-gray-900 text-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Сброс пароля</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Новый пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 bg-gray-800 rounded"
        />
        <input
          type="password"
          placeholder="Повторите пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full p-2 bg-gray-800 rounded"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          {submitting ? 'Сохранение...' : 'Сохранить пароль'}
        </button>
      </form>
    </div>
  )
}
