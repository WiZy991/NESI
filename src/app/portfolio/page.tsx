'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Plus, Edit2, Trash2, X, ExternalLink, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import { useConfirm } from '@/lib/confirm'
import { toast } from 'sonner'
import VideoPlayer from '@/components/VideoPlayer'

type PortfolioItem = {
  id: string
  title: string
  description: string
  imageUrl: string | null
  mediaType?: string | null
  externalUrl: string | null
  taskId: string | null
  createdAt: string
  task?: {
    id: string
    title: string
    status: string
  }
}

function PortfolioPageContent() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { confirm, Dialog } = useConfirm()
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string>('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    mediaType: 'image',
    externalUrl: '',
    taskId: '',
  })

  useEffect(() => {
    // Редирект для заказчиков
    if (!userLoading && user && user.role !== 'executor') {
      router.push('/profile')
      return
    }
    
    if (user && user.role === 'executor') {
      fetchPortfolio()
    }
  }, [user, userLoading, router])

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (res.status === 403) {
        // Заказчик пытается получить доступ - редирект
        router.push('/profile')
        return
      }
      if (!res.ok) throw new Error('Ошибка загрузки')
      const data = await res.json()
      setPortfolio(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Определяем тип файла
      const isVideo = file.type.startsWith('video/')
      
      // Проверяем размер файла
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB для изображений
      const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB для видео
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
      
      if (file.size > maxSize) {
        alert(`Файл слишком большой. Максимум ${isVideo ? '50MB' : '5MB'} для ${isVideo ? 'видео' : 'изображений'}`)
        e.target.value = '' // Очищаем input
        return
      }
      
      setMediaFile(file)
      setMediaType(isVideo ? 'video' : 'image')
      
      // Создаём превью
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadMedia = async (): Promise<{ url: string; mediaType: string } | null> => {
    if (!mediaFile) return null
    
    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', mediaFile)
      
      const res = await fetch('/api/upload/portfolio', {
        method: 'POST',
        body: uploadFormData,
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Ошибка загрузки файла')
        return null
      }
      
      const data = await res.json()
      return { url: data.url, mediaType: data.mediaType }
    } catch (err) {
      console.error(err)
      alert('Ошибка загрузки файла')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Загружаем медиа если выбрано новое
      let imageUrl = formData.imageUrl
      let mediaType = formData.mediaType
      
      if (mediaFile) {
        const uploaded = await uploadMedia()
        if (uploaded) {
          imageUrl = uploaded.url
          mediaType = uploaded.mediaType
        } else {
          return // Прерываем если загрузка не удалась
        }
      }
      
      const url = editingId ? `/api/portfolio/${editingId}` : '/api/portfolio'
      const method = editingId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imageUrl,
          mediaType,
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Ошибка сохранения')
        return
      }
      
      await fetchPortfolio()
      setShowForm(false)
      setEditingId(null)
      setMediaFile(null)
      setMediaPreview('')
      setMediaType('image')
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        mediaType: 'image',
        externalUrl: '',
        taskId: '',
      })
    } catch (err) {
      console.error(err)
      alert('Ошибка сохранения')
    }
  }

  const handleEdit = (item: PortfolioItem) => {
    setEditingId(item.id)
    const itemMediaType = item.mediaType || 'image'
    setFormData({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl || '',
      mediaType: itemMediaType,
      externalUrl: item.externalUrl || '',
      taskId: item.taskId || '',
    })
    setMediaFile(null)
    setMediaPreview(item.imageUrl || '')
    setMediaType(itemMediaType as 'image' | 'video')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    await confirm({
      title: 'Удаление элемента портфолио',
      message: 'Вы уверены, что хотите удалить этот элемент портфолио? Это действие нельзя отменить.',
      type: 'danger',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Ошибка удаления')
          await fetchPortfolio()
          toast.success('Элемент портфолио удалён')
        } catch (err) {
          console.error(err)
          toast.error('Ошибка удаления')
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-300 text-lg animate-pulse">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-emerald-400 mb-2 flex items-center gap-3">
              <Briefcase className="w-10 h-10" />
              Мое портфолио
            </h1>
            <p className="text-gray-300">Покажите свои лучшие работы</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setMediaFile(null)
              setMediaPreview('')
              setMediaType('image')
              setFormData({
                title: '',
                description: '',
                imageUrl: '',
                mediaType: 'image',
                externalUrl: '',
                taskId: '',
              })
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center gap-2"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                Отмена
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Добавить работу
              </>
            )}
          </button>
        </div>

        {/* Форма добавления/редактирования */}
        {showForm && (
          <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-8">
            <h2 className="text-emerald-400 text-xl font-bold mb-4">
              {editingId ? 'Редактировать работу' : 'Добавить работу'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-emerald-300 text-sm mb-2 block">Название *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-900/50 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  required
                />
              </div>
              
              <div>
                <label className="text-emerald-300 text-sm mb-2 block">Описание *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-900/50 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  required
                />
              </div>
              
              <div>
                <label className="text-emerald-300 text-sm mb-2 block">Медиа работы (изображение или видео)</label>
                
                {/* Превью медиа */}
                {mediaPreview && (
                  <div className="mb-3 relative">
                    {mediaType === 'video' ? (
                      <video 
                        src={mediaPreview} 
                        controls
                        className="w-full max-w-md h-48 object-cover rounded-lg border border-emerald-500/30"
                      />
                    ) : (
                      <img 
                        src={mediaPreview} 
                        alt="Preview" 
                        className="w-full max-w-md h-48 object-cover rounded-lg border border-emerald-500/30"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaFile(null)
                        setMediaPreview('')
                        setMediaType('image')
                        setFormData({ ...formData, imageUrl: '', mediaType: 'image' })
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Input для загрузки файла */}
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 bg-gray-900/50 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg hover:border-emerald-500 hover:bg-emerald-500/10 transition">
                      <Plus className="w-4 h-4" />
                      <span>{mediaPreview ? 'Изменить медиа' : 'Загрузить изображение или видео'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Изображения: JPG, PNG, GIF, WEBP • Максимум 5MB<br />
                  Видео: MP4, WEBM, MOV, AVI • Максимум 50MB
                </p>
              </div>
              
              <div>
                <label className="text-emerald-300 text-sm mb-2 block">Внешняя ссылка</label>
                <input
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  className="w-full bg-gray-900/50 border border-emerald-500/30 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  placeholder="https://example.com"
                />
              </div>
              
              <button
                type="submit"
                disabled={uploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Загрузка...' : editingId ? 'Сохранить изменения' : 'Добавить в портфолио'}
              </button>
            </form>
          </div>
        )}

        {/* Список портфолио */}
        {portfolio.length === 0 ? (
          <div className="bg-black/40 p-12 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-center">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-emerald-400 text-xl font-semibold mb-2">Портфолио пусто</h3>
            <p className="text-gray-400 mb-4">Добавьте свои лучшие работы</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить первую работу
            </button>
          </div>
        ) : (
          <PortfolioGrid portfolio={portfolio} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-emerald-300 text-lg animate-pulse">Загрузка...</div>
      </div>
    }>
      <PortfolioPageContent />
    </Suspense>
  )
}

// Функция для определения типа медиа по расширению файла
function detectMediaType(imageUrl: string | null, currentType?: string | null): 'image' | 'video' | 'document' {
  // Если currentType валидный и передан, используем его (приоритет)
  if (currentType === 'video' || currentType === 'image' || currentType === 'document') {
    return currentType as 'image' | 'video' | 'document'
  }
  
  // Затем проверяем расширение файла в URL
  if (imageUrl) {
    const lower = imageUrl.toLowerCase()
    
    // Извлекаем расширение файла из URL (может быть в любом месте пути)
    const extensionMatch = lower.match(/\.(mp4|webm|mov|avi|mkv|wmv|flv|m4v|3gp|ogv)$/i)
    if (extensionMatch) {
      // Видео форматы
      return 'video'
    }
    
    const documentMatch = lower.match(/\.(pdf|doc|docx|txt|rtf|odt|xls|xlsx|ppt|pptx)$/i)
    if (documentMatch) {
      // Документы
      return 'document'
    }
    
    const imageMatch = lower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif)$/i)
    if (imageMatch) {
      // Изображения
      return 'image'
    }
    
    // Проверяем расширения в любом месте URL (для путей типа /uploads/portfolio/file.mp4)
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || 
        lower.includes('.avi') || lower.includes('.mkv') || lower.includes('.wmv') || 
        lower.includes('.flv') || lower.includes('.m4v')) {
      return 'video'
    }
    
    if (lower.includes('.pdf') || lower.includes('.doc') || lower.includes('.docx') || 
        lower.includes('.txt') || lower.includes('.rtf') || lower.includes('.odt')) {
      return 'document'
    }
    
    if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || 
        lower.includes('.gif') || lower.includes('.webp') || lower.includes('.svg') ||
        lower.includes('.bmp') || lower.includes('.ico')) {
      return 'image'
    }
  }
  
  // По умолчанию - изображение
  return 'image'
}

// Функция для получения правильного URL медиа
function getMediaUrl(imageUrl: string | null): string {
  if (!imageUrl || imageUrl.trim() === '') return ''
  
  const trimmedUrl = imageUrl.trim()
  
  // Если уже полный URL (http/https), используем как есть
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl
  }
  
  // Если уже начинается с /api/files/ или /uploads/, используем как есть
  if (trimmedUrl.startsWith('/api/files/') || trimmedUrl.startsWith('/uploads/')) {
    return trimmedUrl
  }
  
  // Если начинается с /, используем как есть (для других API путей)
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl
  }
  
  // Если это выглядит как ID файла (UUID или cuid), используем через /api/files/
  // UUID формат: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // CUID формат: cxxxxxxxxxxxxxxxxxxxxx (примерно 25 символов)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmedUrl)) {
    return `/api/files/${trimmedUrl}`
  }
  
  // По умолчанию возвращаем как есть (может быть относительный путь)
  return trimmedUrl
}

function PortfolioGrid({ portfolio, onEdit, onDelete }: { portfolio: PortfolioItem[], onEdit: (item: PortfolioItem) => void, onDelete: (id: string) => void }) {
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null)
  
  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {portfolio.map((item) => {
        const itemMediaType = detectMediaType(item.imageUrl, item.mediaType)
        const descriptionLength = item.description.length
        const shouldShowExpand = descriptionLength > 150
        const isExpanded = expandedDescriptions.has(item.id)
        
        return (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className="bg-black/40 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] overflow-hidden hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition flex flex-col cursor-pointer"
          >
            {item.imageUrl && (
              <div className="aspect-video bg-gray-900 relative overflow-hidden">
                {itemMediaType === 'video' ? (
                  <VideoPlayer
                    src={getMediaUrl(item.imageUrl)}
                    className="w-full h-full"
                    onError={(e) => {
                      console.error('Ошибка загрузки видео портфолио:', item.imageUrl)
                      if (e.currentTarget) {
                        e.currentTarget.style.display = 'none'
                      }
                    }}
                  />
                ) : itemMediaType === 'document' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <iframe
                      src={getMediaUrl(item.imageUrl)}
                      className="w-full h-full"
                      title={item.title}
                      onError={(e) => {
                        console.error('Ошибка загрузки документа портфолио:', item.imageUrl)
                        const iframe = e.target as HTMLIFrameElement
                        iframe.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={getMediaUrl(item.imageUrl)}
                    alt={item.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      console.error('Ошибка загрузки изображения портфолио:', item.imageUrl)
                      const img = e.target as HTMLImageElement
                      const currentSrc = img.src
                      // Если это не /api/files/, пробуем через /api/files/
                      if (!currentSrc.includes('/api/files/') && !item.imageUrl.startsWith('/uploads/')) {
                        img.src = `/api/files/${item.imageUrl}`
                      } else {
                        img.style.display = 'none'
                      }
                    }}
                  />
                )}
              </div>
            )}
            
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-emerald-400 font-bold text-lg mb-2">{item.title}</h3>
              <div className="flex-1">
                <p className={`text-gray-400 text-sm mb-3 ${!isExpanded && shouldShowExpand ? 'line-clamp-3' : ''}`}>
                  {item.description}
                </p>
                {shouldShowExpand && (
                  <button
                    onClick={() => toggleDescription(item.id)}
                    className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 mb-3 transition"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Свернуть
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Развернуть
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {item.task && (
                <div className="text-emerald-300 text-xs mb-3 flex items-center gap-1">
                  <span>📋</span>
                  <span>Связано с задачей: {item.task.title}</span>
                </div>
              )}
              
              {item.externalUrl && (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 text-sm mb-3 flex items-center gap-1 hover:underline transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть проект
                </a>
              )}
              
              <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit(item)}
                  className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-lg text-sm transition flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Редактировать
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm transition flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
    {selectedItem && (
      <PortfolioDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    )}
    </>
  )
}

function PortfolioDetailModal({ item, onClose }: { item: PortfolioItem, onClose: () => void }) {
  const itemMediaType = detectMediaType(item.imageUrl, item.mediaType)
  
  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
      data-nextjs-scroll-focus-boundary={false}
    >
      <div
        className="bg-gray-900/95 border border-emerald-500/20 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Компактный заголовок */}
        <div className="px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between bg-gray-900/50">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400 truncate pr-2">{item.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-gray-800 rounded"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        
        {/* Контент с прокруткой */}
        <div className="overflow-y-auto flex-1">
          {item.imageUrl && (
            <div className="bg-gray-800/50">
              {itemMediaType === 'video' ? (
                <VideoPlayer
                  src={getMediaUrl(item.imageUrl)}
                  className="w-full h-auto max-h-[50vh]"
                  onError={(e) => {
                    console.error('Ошибка загрузки видео портфолио:', item.imageUrl)
                    if (e.currentTarget) {
                      e.currentTarget.style.display = 'none'
                    }
                  }}
                />
              ) : itemMediaType === 'document' ? (
                <div className="w-full h-[60vh] bg-gray-900">
                  <iframe
                    src={getMediaUrl(item.imageUrl)}
                    className="w-full h-full"
                    title={item.title}
                    onError={(e) => {
                      console.error('Ошибка загрузки документа портфолио:', item.imageUrl)
                      const iframe = e.target as HTMLIFrameElement
                      iframe.style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <img
                  src={getMediaUrl(item.imageUrl)}
                  alt={item.title}
                  className="w-full h-auto max-h-[50vh] object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    const currentSrc = img.src
                    if (!currentSrc.includes('/api/files/') && !item.imageUrl?.startsWith('/uploads/')) {
                      img.src = `/api/files/${item.imageUrl}`
                    } else {
                      img.style.display = 'none'
                    }
                  }}
                />
              )}
            </div>
          )}
          
          <div className="p-4 space-y-3">
            <div>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
            </div>
            
            {item.task && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <div className="text-emerald-400 text-xs mb-1 font-medium">📋 Связанная задача</div>
                <div className="text-white text-sm">{item.task.title}</div>
              </div>
            )}
            
            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-lg transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Открыть проект</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

