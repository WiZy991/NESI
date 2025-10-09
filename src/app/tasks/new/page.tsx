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
  const { token, user } = useUser()  // расширено, чтобы можно было передать роль
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [files, setFiles] = useState<File[]>([])

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

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('subcategoryId', subcategoryId)

      files.forEach((file) => formData.append('files', file))

      await toast.promise(
        fetch('/api/tasks', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }).then((res) => {
          if (!res.ok) throw new Error('Ошибка при создании')
          return res
        }),
        {
          loading: 'Создание задачи...',
          success: 'Задача успешно создана!',
          error: 'Ошибка сервера',
        }
      )

      router.push('/profile')
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId)

  return (
    <ProtectedPage>
      {user && <Onboarding role={user.role} />}  {/* ← добавил запуск Onboarding */}

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

        {/* Загрузка файлов */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="task-files"
            className="cursor-pointer px-3 py-2 rounded-lg border border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-black transition text-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          >
            📎 Прикрепить файлы
          </label>
          <input
            id="task-files"
            type="file"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                setFiles(Array.from(e.target.files))
              }
            }}
            className="hidden"
          />
          {files.length > 0 && (
            <ul className="text-xs text-emerald-400 list-disc pl-4">
              {files.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          )}
        </div>

        {/*метка для онбординга */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold transition create-task-btn ${
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
