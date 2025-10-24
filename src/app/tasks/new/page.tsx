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
      <div className="relative flex justify-center items-center min-h-[80vh] overflow-hidden">
        {/* фоновая подсветка */}
        <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute w-[900px] h-[900px] bg-emerald-700/10 blur-[180px] rounded-full animate-pulse-slower" />

        <div className="relative w-full max-w-xl mx-auto p-8 space-y-7 bg-gradient-to-br from-black/60 via-black/40 to-emerald-900/20 border border-emerald-500/20 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all duration-700 hover:shadow-[0_0_60px_rgba(16,185,129,0.35)] animate-fade-in">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-semibold text-emerald-400 flex justify-center items-center gap-2">
              <span>📄</span> Создать задачу
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Опишите задачу максимально понятно — это поможет ускорить поиск исполнителя
            </p>
          </div>

          {/* Название */}
          <input
            type="text"
            placeholder="Например: Разработать сайт для агентства"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/60 border border-emerald-700 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-emerald-400/30 outline-none transition-all duration-300 shadow-inner focus:scale-[1.02]"
          />

          {/* Описание */}
          <textarea
            placeholder="Опишите, что нужно сделать, какие есть требования и сроки..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 h-32 rounded-xl bg-black/60 border border-emerald-700 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-emerald-400/30 outline-none transition-all duration-300 shadow-inner resize-none focus:scale-[1.02]"
          />

          {/* Категория */}
<div className="space-y-2 relative">
  <label className="text-sm text-emerald-400 font-medium">Категория</label>
  <div className="relative">
    <button
      type="button"
      onClick={() =>
        setCategoryId(categoryId === 'open' ? '' : 'open')
      }
      className="w-full text-left px-4 py-3 rounded-xl bg-black/60 border border-emerald-700 text-white focus:border-emerald-400 outline-none flex justify-between items-center shadow-[0_0_15px_rgba(16,185,129,0.15)]"
    >
      {selectedCategory?.name || 'Выберите категорию'}
      <span className="text-emerald-400">▼</span>
    </button>

    {categoryId === 'open' && (
      <div className="absolute z-50 mt-2 w-full bg-[#001a12]/90 border border-emerald-700 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] backdrop-blur-md animate-fade-in">
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                setCategoryId(cat.id)
                setSubcategoryId('')
              }}
              className="px-4 py-2 text-white hover:bg-emerald-700/30 hover:text-emerald-300 cursor-pointer transition-all"
            >
              {cat.name}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>

{/* Подкатегория */}
{selectedCategory && (
  <div className="space-y-2 relative">
    <label className="text-sm text-emerald-400 font-medium">Подкатегория</label>
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setSubcategoryId(subcategoryId === 'open' ? '' : 'open')
        }
        className="w-full text-left px-4 py-3 rounded-xl bg-black/60 border border-emerald-700 text-white focus:border-emerald-400 outline-none flex justify-between items-center shadow-[0_0_15px_rgba(16,185,129,0.15)]"
      >
        {selectedCategory.subcategories.find((s) => s.id === subcategoryId)?.name || 'Выберите подкатегорию'}
        <span className="text-emerald-400">▼</span>
      </button>

      {subcategoryId === 'open' && (
        <div className="absolute z-50 mt-2 w-full bg-[#001a12]/90 border border-emerald-700 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] backdrop-blur-md animate-fade-in">
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {selectedCategory.subcategories.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setSubcategoryId(sub.id)}
                className="px-4 py-2 text-white hover:bg-emerald-700/30 hover:text-emerald-300 cursor-pointer transition-all"
              >
                {sub.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}

          {/* Drop-зона */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
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
            className={`w-full py-3 rounded-xl font-semibold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] ${
              loading
                ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95'
            }`}
          >
            {loading ? 'Создание...' : '🚀 Создать задачу'}
          </button>

          {/* Подсказка */}
          <p className="text-center text-xs text-gray-500 mt-3">
            Все поля обязательны для заполнения
          </p>
        </div>
      </div>
    </ProtectedPage>
  )
}
