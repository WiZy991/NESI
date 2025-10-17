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
      <div className="relative flex justify-center items-center min-h-[80vh]">
        {/* свечение позади карточки */}
        <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute w-[800px] h-[800px] bg-green-900/10 blur-[180px] rounded-full animate-pulse-slower" />

        <div className="relative w-full max-w-xl mx-auto p-8 space-y-6 bg-gradient-to-br from-black/60 via-black/40 to-emerald-900/20 border border-emerald-500/30 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all duration-700 hover:shadow-[0_0_60px_rgba(16,185,129,0.35)] animate-fade-in">
          <h1 className="text-3xl font-bold text-emerald-400 mb-6 text-center flex items-center justify-center gap-3">
            <span>🧩</span> Создать задачу
          </h1>

          <input
            type="text"
            placeholder="Название задачи"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/60 border border-emerald-700 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-emerald-400/30 outline-none transition-all duration-300 shadow-inner"
          />

          <textarea
            placeholder="Опиши суть задачи..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 h-32 rounded-lg bg-black/60 border border-emerald-700 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-emerald-400/30 outline-none transition-all duration-300 shadow-inner"
          />

          {/* Категория */}
          <div className="space-y-2">
            <label className="text-sm text-emerald-400 font-medium">Категория</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setSubcategoryId('')
              }}
              className="w-full p-3 rounded-lg bg-black/60 border border-emerald-700 text-white focus:border-emerald-400 outline-none transition-all duration-300"
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Подкатегория */}
          {categoryId && (
            <div className="space-y-2">
              <label className="text-sm text-emerald-400 font-medium">Подкатегория</label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full p-3 rounded-lg bg-black/60 border border-emerald-700 text-white focus:border-emerald-400 outline-none transition-all duration-300"
              >
                <option value="">Выберите подкатегорию</option>
                {selectedCategory?.subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drop-зона для файлов */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 cursor-pointer ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-400/10 scale-[1.02]'
                : 'border-emerald-700 bg-black/40 hover:border-emerald-500/60 hover:bg-black/30'
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
            <label htmlFor="task-files" className="block cursor-pointer text-emerald-300">
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
            className={`w-full py-3 rounded-xl font-semibold text-lg shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300 ${
              loading
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95'
            }`}
          >
            {loading ? 'Создание...' : '🚀 Создать задачу'}
          </button>
        </div>
      </div>
    </ProtectedPage>
  )
}
