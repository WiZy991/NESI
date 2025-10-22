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

  // подтягиваем категории без кеша и поддерживаем оба варианта ответа API
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      if (!res.ok) throw new Error('bad response')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : data.categories || [])
    } catch {
      toast.error('Ошибка загрузки категорий')
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // лёгкое «свечение» за курсором — чисто косметика
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
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
          headers: { Authorization: `Bearer ${token}` },
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
      {/* фон: мягкое неоновое поле + сетка */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_800px_at_var(--x,50%)_var(--y,50%),rgba(16,185,129,0.08),transparent_60%)] transition-[background] duration-300" />
      </div>

      <div className="relative flex justify-center items-center min-h-[80vh] overflow-hidden px-4">
        {/* большие «ауры» */}
        <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute w-[900px] h-[900px] bg-emerald-700/10 blur-[180px] rounded-full animate-[pulse_6s_ease-in-out_infinite] delay-2000" />

        {/* карточка */}
        <div className="relative w-full max-w-xl mx-auto p-8 space-y-7
          bg-gradient-to-br from-black/70 via-emerald-950/25 to-black/60
          border border-emerald-400/25 rounded-3xl
          shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-xl
          transition-all duration-700 hover:shadow-[0_0_70px_rgba(16,185,129,0.45)]
          animate-[pulse_7s_ease-in-out_infinite]">

          {/* заголовок */}
          <div className="text-center mb-2">
            <h1 className="text-3xl font-semibold text-emerald-400 flex justify-center items-center gap-2 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]">
              <span>📄</span> Создать задачу
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Опишите задачу максимально понятно — это поможет ускорить поиск исполнителя
            </p>
          </div>

          {/* Название */}
          <div className="space-y-2">
            <label className="text-sm text-emerald-400 font-medium">Название</label>
            <input
              type="text"
              placeholder="Например: Разработать сайт для агентства"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/70 border border-emerald-800 text-white
                placeholder-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30
                outline-none transition-all duration-300 shadow-inner hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            />
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <label className="text-sm text-emerald-400 font-medium">Описание</label>
            <textarea
              placeholder="Опишите, что нужно сделать, какие есть требования и сроки..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 h-32 rounded-xl bg-black/70 border border-emerald-800 text-white
                placeholder-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30
                outline-none transition-all duration-300 shadow-inner resize-none"
            />
          </div>

          {/* Категория */}
          <div className="space-y-2">
            <label className="text-sm text-emerald-400 font-medium">Категория</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setSubcategoryId('')
              }}
              className="w-full p-3 rounded-xl bg-black/70 border border-emerald-800 text-white
                focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30
                outline-none transition-all duration-300"
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
                className="w-full p-3 rounded-xl bg-black/70 border border-emerald-800 text-white
                  focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30
                  outline-none transition-all duration-300"
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

          {/* Drop-зона */}
          <div
            className={`relative overflow-hidden group border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
              isDragOver
                ? 'border-emerald-400 bg-emerald-400/10 scale-[1.01]'
                : 'border-emerald-800 bg-black/50 hover:border-emerald-500/60 hover:bg-black/40'
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
            {/* бегущая подсветка по краям */}
            <div className="pointer-events-none absolute -inset-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(16,185,129,0.25)_90deg,transparent_180deg,rgba(16,185,129,0.25)_270deg,transparent_360deg)] animate-[spin_6s_linear_infinite]" />
            </div>

            <label htmlFor="task-files" className="relative block cursor-pointer text-emerald-300 font-medium tracking-wide">
              📎 Перетащи файлы сюда или нажми для выбора
            </label>
            <input
              id="task-files"
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) setFiles(Array.from(e.target.files))
              }}
              className="hidden"
            />

            {files.length > 0 && (
              <ul className="mt-3 text-xs text-emerald-400/90 list-disc pl-4 text-left">
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
            className={`relative w-full py-3 rounded-xl font-semibold text-lg tracking-wide overflow-hidden
              shadow-[0_0_25px_rgba(16,185,129,0.30)]
              ${loading ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                        : 'active:scale-95'}`}
          >
            {/* градиент подложка */}
            <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500
              hover:from-teal-400 hover:to-emerald-400" />
            {/* бликовая «шторка» */}
            <span className="absolute -inset-y-10 -left-10 w-1/3 rotate-12 bg-white/20 blur-xl
              transition-transform duration-700 group-hover:translate-x-[260%]" />
            <span className="relative z-10 text-white">
              {loading ? 'Создание...' : '🚀 Создать задачу'}
            </span>
          </button>

          {/* Подсказка */}
          <p className="text-center text-xs text-gray-500">
            Все поля обязательны для заполнения
          </p>
        </div>
      </div>
    </ProtectedPage>
  )
}
