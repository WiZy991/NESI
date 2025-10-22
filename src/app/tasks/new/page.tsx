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
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : data.categories || [])
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
      <div className="relative flex justify-center items-center min-h-[80vh]">
        <div className="relative w-full max-w-xl mx-auto p-8 space-y-7 bg-black/60 border border-emerald-600/30 rounded-2xl shadow-lg backdrop-blur-sm">

          <div className="text-center mb-4">
            <h1 className="text-3xl font-semibold text-emerald-400">Создать задачу</h1>
            <p className="text-sm text-gray-400 mt-2">
              Опишите задачу максимально понятно — это поможет быстрее найти исполнителя
            </p>
          </div>

          {/* Название */}
          <input
            type="text"
            placeholder="Название задачи"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-lg bg-neutral-900 border border-emerald-800 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-0 outline-none transition-all duration-200"
          />

          {/* Описание */}
          <textarea
            placeholder="Что нужно сделать?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 h-32 rounded-lg bg-neutral-900 border border-emerald-800 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-0 outline-none transition-all duration-200 resize-none"
          />

          {/* Категория */}
          <div className="space-y-2">
            <label className="text-sm text-emerald-400 font-medium">Категория</label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setSubcategoryId('')
                }}
                className="w-full appearance-none p-3 rounded-lg bg-neutral-900 border border-emerald-800 text-white focus:border-emerald-400 outline-none transition-all duration-200"
              >
                <option value="">Выберите категорию</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-3 text-emerald-400 pointer-events-none">▼</span>
            </div>
          </div>

          {/* Подкатегория */}
          {categoryId && (
            <div className="space-y-2">
              <label className="text-sm text-emerald-400 font-medium">Подкатегория</label>
              <div className="relative">
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="w-full appearance-none p-3 rounded-lg bg-neutral-900 border border-emerald-800 text-white focus:border-emerald-400 outline-none transition-all duration-200"
                >
                  <option value="">Выберите подкатегорию</option>
                  {selectedCategory?.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-3 text-emerald-400 pointer-events-none">▼</span>
              </div>
            </div>
          )}

          {/* Drop-зона */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-5 text-center transition-all duration-200 cursor-pointer ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-400/10'
                : 'border-emerald-800 bg-neutral-900 hover:border-emerald-500/60'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              const dropped = Array.from(e.dataTransfer.files)
              setFiles((prev) => [...prev, ...dropped])
            }}
          >
            <label htmlFor="task-files" className="block cursor-pointer text-emerald-300 font-medium">
              📎 Перетащи файлы сюда или нажми для выбора
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
              <ul className="mt-3 text-xs text-emerald-400 list-disc pl-4 text-left">
                {files.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Кнопка */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
              loading
                ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {loading ? 'Создание...' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </ProtectedPage>
  )
}
