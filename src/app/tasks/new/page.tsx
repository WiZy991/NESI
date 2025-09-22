'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'

type Category = {
  id: string
  name: string
  subcategories: { id: string; name: string }[]
}

export default function CreateTaskPage() {
  const { token } = useUser()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  const [loading, setLoading] = useState(false)

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err) {
      toast.error('Ошибка загрузки категорий')
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !subcategoryId) {
      return toast.error('Заполни все поля и выбери подкатегорию')
    }
    if (!token) {
      return toast.error('Нет токена авторизации')
    }

    setLoading(true)
    toast.loading('Создание задачи...')

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, subcategoryId }),
      })

      if (!res.ok) throw new Error('Ошибка при создании')

      toast.success('Задача создана!')
      router.push('/profile')
    } catch (err) {
      toast.error('Ошибка сервера')
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId)

  return (
    <ProtectedPage>
      <div className="max-w-xl mx-auto p-6 space-y-4 bg-black/40 border border-green-500/30 rounded-lg shadow-[0_0_15px_rgba(0,255,150,0.2)]">
        <h1 className="text-2xl font-bold text-green-400 mb-4">📝 Создать задачу</h1>

        <input
          type="text"
          placeholder="Название задачи"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded-lg bg-black/60 border border-gray-700 text-white placeholder-gray-400 focus:border-green-400 outline-none"
        />

        <textarea
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-lg bg-black/60 border border-gray-700 text-white placeholder-gray-400 focus:border-green-400 outline-none h-32"
        />

        {/* Категория */}
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setSubcategoryId('')
          }}
          className="w-full p-3 rounded-lg bg-black/60 border border-gray-700 text-white focus:border-green-400 outline-none"
        >
          <option value="">Выберите категорию</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Подкатегория */}
        {categoryId && (
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/60 border border-gray-700 text-white focus:border-green-400 outline-none"
          >
            <option value="">Выберите подкатегорию</option>
            {selectedCategory?.subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            loading
              ? 'bg-gray-600 cursor-not-allowed text-gray-300'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-[0_0_10px_rgba(0,255,150,0.3)]'
          }`}
        >
          {loading ? 'Создание...' : 'Создать задачу'}
        </button>
      </div>
    </ProtectedPage>
  )
}
