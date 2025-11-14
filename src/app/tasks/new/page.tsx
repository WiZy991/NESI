'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { useConfirm } from '@/lib/confirm'
import ProtectedPage from '@/components/ProtectedPage'
import { useAutoSave } from '@/hooks/useAutoSave'
import TaskCreateProgress from '@/components/TaskCreateProgress'
import TaskPreview from '@/components/TaskPreview'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import TaskTemplates, { SaveTemplateButton } from '@/components/TaskTemplates'
import type { TaskTemplate } from '@/hooks/useTaskTemplates'
import { BadgeUnlockedModal, BadgeData } from '@/components/BadgeUnlockedModal'

type Category = {
  id: string
  name: string
  subcategories: { id: string; name: string }[]
}

export default function CreateTaskPage() {
  const { token } = useUser()
  const router = useRouter()
  const { confirm, Dialog } = useConfirm()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentBadge, setCurrentBadge] = useState<BadgeData | null>(null)
  const [badgeQueue, setBadgeQueue] = useState<BadgeData[]>([])
  const taskBroadcastRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('BroadcastChannel' in window) {
      taskBroadcastRef.current = new BroadcastChannel('nesi-tasks')
    }
    return () => {
      taskBroadcastRef.current?.close()
      taskBroadcastRef.current = null
    }
  }, [])

  // Автосохранение черновика
  const formData = {
    title,
    description,
    categoryId,
    subcategoryId,
  }
  const { loadDraft, clearDraft } = useAutoSave(formData, 'new_task', 30000)

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

  // Загрузка черновика при монтировании
  useEffect(() => {
    const loadDraftIfConfirmed = async () => {
      const draft = loadDraft()
      if (draft && (draft.title || draft.description)) {
        await confirm({
          title: 'Найден черновик',
          message: 'Найден сохраненный черновик. Загрузить?',
          type: 'info',
          confirmText: 'Загрузить',
          cancelText: 'Отмена',
          onConfirm: () => {
            setTitle(draft.title || '')
            setDescription(draft.description || '')
            setCategoryId(draft.categoryId || '')
            setSubcategoryId(draft.subcategoryId || '')
          },
        })
      }
    }
    loadDraftIfConfirmed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showNextBadge = () => {
    if (badgeQueue.length > 0) {
      setCurrentBadge(badgeQueue[0])
      setBadgeQueue(prev => prev.slice(1))
    } else {
      setCurrentBadge(null)
    }
  }

  const notifyTaskCreated = useCallback((task: any) => {
    try {
      taskBroadcastRef.current?.postMessage({
        type: 'task_created',
        task,
      })
    } catch (err) {
      console.warn('BroadcastChannel недоступен для задач:', err)
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nesi-task-created', {
          detail: { task },
        })
      )
    }
  }, [])

  const handleBadgeClose = () => {
    setCurrentBadge(null)
    // Показываем следующее достижение после небольшой задержки
    setTimeout(() => {
      if (badgeQueue.length > 0) {
        showNextBadge()
      }
    }, 300)
  }

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
      files.forEach((file) => {
        formData.append('files', file)
      })

      const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Ошибка при создании задачи')
        return
      }

      clearDraft()
      if (data.task) {
        notifyTaskCreated(data.task)
      }
      toast.success('Задача создана!')

      // Показываем достижения, если они есть
      if (data.awardedBadges && data.awardedBadges.length > 0) {
        setBadgeQueue(data.awardedBadges)
        showNextBadge()
        // Переходим на страницу задачи после показа всех достижений
        setTimeout(() => {
          router.push(`/tasks/${data.task.id}`)
        }, data.awardedBadges.length * 5500) // Время на показ всех достижений
      } else {
        router.push(`/tasks/${data.task.id}`)
      }
    } catch (err) {
      console.error('Ошибка при создании задачи:', err)
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  // Определяем текущий шаг для прогресс-индикатора
  const getCurrentStep = () => {
    let step = 1
    if (title.trim()) step = 2
    if (description.trim()) step = 3
    if (subcategoryId) step = 4
    return step
  }

  const currentStep = getCurrentStep()
  const selectedCategory = categories.find((c) => c.id === categoryId)

  // Закрытие предпросмотра по Escape
  useEscapeKey(() => {
    if (showPreview) {
      setShowPreview(false)
    }
  })

  // Проверка, можно ли показать предпросмотр
  const canPreview = title.trim() && description.trim() && subcategoryId

  return (
    <ProtectedPage>
      <div className="relative flex justify-center items-center min-h-[80vh] overflow-hidden">
        {/* фоновая подсветка - убрана анимация pulse для устранения мерцания */}
        <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute w-[900px] h-[900px] bg-emerald-700/10 blur-[180px] rounded-full" />

        <div className="relative w-full max-w-xl mx-auto p-8 space-y-7 bg-gradient-to-br from-black/60 via-black/40 to-emerald-900/20 border border-emerald-500/20 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all duration-700 hover:shadow-[0_0_60px_rgba(16,185,129,0.35)] animate-fade-in">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-semibold text-emerald-400 flex justify-center items-center gap-2">
              <span>📄</span> Создать задачу
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Опишите задачу максимально понятно — это поможет ускорить поиск исполнителя
            </p>
            <div className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-2">
              <span>💾</span>
              <span>Автосохранение каждые 30 секунд</span>
            </div>
          </div>

          {/* Прогресс-индикатор */}
          <TaskCreateProgress currentStep={currentStep} totalSteps={4} />

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

          {/* Шаблоны задач */}
          <div className="flex items-center justify-between">
            <TaskTemplates
              onSelectTemplate={(template: TaskTemplate) => {
                setTitle(template.title)
                setDescription(template.description)
                setCategoryId(template.categoryId)
                setSubcategoryId(template.subcategoryId)
                toast.success(`Шаблон "${template.name}" загружен`)
              }}
              currentData={{
                title,
                description,
                categoryId,
                subcategoryId,
              }}
            />
            <SaveTemplateButton
              currentData={{
                title,
                description,
                categoryId,
                subcategoryId,
              }}
              onSaved={() => toast.success('Шаблон сохранен')}
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              disabled={!canPreview || loading}
              className={`flex-1 py-3 rounded-xl font-semibold text-lg transition-all duration-300 ${
                canPreview && !loading
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] active:scale-95'
                  : 'bg-gray-700 cursor-not-allowed text-gray-400'
              }`}
              aria-label="Предпросмотр задачи"
            >
              👁️ Предпросмотр
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className={`flex-1 py-3 rounded-xl font-semibold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95'
              }`}
            >
              {loading ? 'Создание...' : '🚀 Создать задачу'}
            </button>
          </div>

          {/* Подсказка */}
          <p className="text-center text-xs text-gray-500 mt-3">
            Все поля обязательны для заполнения
          </p>
        </div>
      </div>

      {/* Предпросмотр задачи */}
      {showPreview && (
        <TaskPreview
          title={title}
          description={description}
          categoryName={selectedCategory?.name}
          subcategoryName={selectedCategory?.subcategories.find(s => s.id === subcategoryId)?.name}
          files={files}
          onClose={() => setShowPreview(false)}
        />
      )}

      {currentBadge && (
        <BadgeUnlockedModal badge={currentBadge} onClose={handleBadgeClose} />
      )}
      {Dialog}
    </ProtectedPage>
  )
}
