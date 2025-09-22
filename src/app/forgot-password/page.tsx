'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      toast.success('Письмо с инструкцией отправлено!')
      setEmail('')
    } else {
      toast.error(data.error || 'Ошибка восстановления')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-gray-900 text-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Восстановление пароля</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Введите ваш email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 bg-gray-800 rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          {loading ? 'Отправка...' : 'Отправить ссылку для сброса'}
        </button>
      </form>
    </div>
  )
}
