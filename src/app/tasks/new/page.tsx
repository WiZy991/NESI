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
import { skillCategories } from '@/components/EditProfileModal'
import { createPortal } from 'react-dom'

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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [showSkillsSelector, setShowSkillsSelector] = useState(false)
  const skillsButtonRef = useRef<HTMLButtonElement>(null)
  const [skillsMenuPosition, setSkillsMenuPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
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
    selectedSkills,
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
            setSelectedSkills(draft.selectedSkills || [])
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
      if (selectedSkills.length > 0) {
        formData.append('skillsRequired', JSON.stringify(selectedSkills))
      }
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
        const errorMessage = data.error || 'Ошибка при создании задачи'
        const details = data.details ? `: ${data.details}` : ''
        console.error('Ошибка создания задачи:', errorMessage, details, data)
        toast.error(`${errorMessage}${details}`)
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

  // Обновление позиции меню навыков
  const updateSkillsMenuPosition = useCallback(() => {
    if (skillsButtonRef.current) {
      const rect = skillsButtonRef.current.getBoundingClientRect()
      setSkillsMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [])

  // Закрытие селектора навыков при клике вне его
  useEffect(() => {
    if (showSkillsSelector) {
      updateSkillsMenuPosition()
      window.addEventListener('scroll', updateSkillsMenuPosition, true)
      window.addEventListener('resize', updateSkillsMenuPosition)
      
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        if (!target.closest('.skills-selector-container') && !target.closest('.skills-menu-portal')) {
          setShowSkillsSelector(false)
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside)
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('scroll', updateSkillsMenuPosition, true)
        window.removeEventListener('resize', updateSkillsMenuPosition)
      }
    } else {
      setSkillsMenuPosition(null)
    }
  }, [showSkillsSelector, updateSkillsMenuPosition])

  return (
    <ProtectedPage>
      <div className="relative flex justify-center items-center min-h-[80vh]">
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

          {/* Выбор навыков */}
          <div className="space-y-2 relative skills-selector-container">
            <label className="text-sm text-emerald-400 font-medium">Навыки (поможет вам быстрее находить отклики)</label>
            <div className="relative">
              <button
                ref={skillsButtonRef}
                type="button"
                onClick={() => {
                  if (!showSkillsSelector) {
                    updateSkillsMenuPosition()
                  }
                  setShowSkillsSelector(!showSkillsSelector)
                }}
                className="w-full text-left px-4 py-3 rounded-xl bg-black/60 border border-emerald-700 text-white focus:border-emerald-400 outline-none flex justify-between items-center shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                {selectedSkills.length > 0 
                  ? `Выбрано навыков: ${selectedSkills.length}` 
                  : 'Выберите требуемые навыки'}
                <span className="text-emerald-400">▼</span>
              </button>

              {showSkillsSelector && skillsMenuPosition && typeof window !== 'undefined' && document.body
                ? createPortal(
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-[9997]"
                        onClick={() => setShowSkillsSelector(false)}
                      />
                      {/* Меню навыков */}
                      <div
                        className="fixed z-[9998] skills-menu-portal bg-[#001a12]/95 border border-emerald-700 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] backdrop-blur-md animate-fade-in max-h-[70vh] overflow-y-auto custom-scrollbar"
                        style={{
                          top: `${skillsMenuPosition.top}px`,
                          left: `${skillsMenuPosition.left}px`,
                          width: `${skillsMenuPosition.width}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-4 space-y-4">
                          {/* Выбранные навыки */}
                          {selectedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-2 pb-3 border-b border-emerald-500/20">
                              {selectedSkills.map(skill => (
                                <span
                                  key={skill}
                                  className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-sm rounded-full border border-emerald-500/40 flex items-center gap-2"
                                >
                                  {skill}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skill))}
                                    className="text-red-400 hover:text-red-300 transition text-xs"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Список категорий навыков */}
                          <div className="space-y-3">
                            {Object.entries(skillCategories).map(([category, skills]) => (
                              <div key={category} className="space-y-2">
                                <h4 className="text-emerald-300 font-medium text-sm">{category}</h4>
                                <div className="flex flex-wrap gap-2">
                                  {skills.map(skill => (
                                    <button
                                      key={skill}
                                      type="button"
                                      onClick={() => {
                                        if (!selectedSkills.includes(skill)) {
                                          setSelectedSkills(prev => [...prev, skill])
                                        }
                                      }}
                                      disabled={selectedSkills.includes(skill)}
                                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                                        selectedSkills.includes(skill)
                                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50 cursor-not-allowed'
                                          : 'bg-black/40 text-gray-300 border-emerald-700/50 hover:bg-emerald-700/30 hover:text-emerald-300 hover:border-emerald-500/50'
                                      }`}
                                    >
                                      {skill}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>,
                    document.body
                  )
                : null}
            </div>
          </div>

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
