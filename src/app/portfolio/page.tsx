'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Plus, Edit2, Trash2, X, ExternalLink } from 'lucide-react'

type PortfolioItem = {
  id: string
  title: string
  description: string
  imageUrl: string | null
  externalUrl: string | null
  taskId: string | null
  createdAt: string
  task?: {
    id: string
    title: string
    status: string
  }
}

export default function PortfolioPage() {
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    externalUrl: '',
    taskId: '',
  })

  useEffect(() => {
    fetchPortfolio()
  }, [])

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio')
      if (res.status === 401) {
        router.push('/login')
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      
      // Создаём превью
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    
    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', imageFile)
      
      const res = await fetch('/api/upload/portfolio', {
        method: 'POST',
        body: uploadFormData,
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Ошибка загрузки изображения')
        return null
      }
      
      const data = await res.json()
      return data.url
    } catch (err) {
      console.error(err)
      alert('Ошибка загрузки изображения')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Загружаем изображение если выбрано новое
      let imageUrl = formData.imageUrl
      if (imageFile) {
        const uploadedUrl = await uploadImage()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
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
      setImageFile(null)
      setImagePreview('')
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
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
    setFormData({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl || '',
      externalUrl: item.externalUrl || '',
      taskId: item.taskId || '',
    })
    setImageFile(null)
    setImagePreview(item.imageUrl || '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот элемент портфолио?')) return
    
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Ошибка удаления')
      await fetchPortfolio()
    } catch (err) {
      console.error(err)
      alert('Ошибка удаления')
    }
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
              setImageFile(null)
              setImagePreview('')
              setFormData({
                title: '',
                description: '',
                imageUrl: '',
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
                <label className="text-emerald-300 text-sm mb-2 block">Изображение работы</label>
                
                {/* Превью изображения */}
                {imagePreview && (
                  <div className="mb-3 relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full max-w-md h-48 object-cover rounded-lg border border-emerald-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview('')
                        setFormData({ ...formData, imageUrl: '' })
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
                      <span>{imagePreview ? 'Изменить изображение' : 'Загрузить изображение'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  JPG, PNG, GIF, WEBP • Максимум 5MB
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((item) => (
              <div key={item.id} className="bg-black/40 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] overflow-hidden hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition">
                {item.imageUrl && (
                  <div className="aspect-video bg-gray-900 relative overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <h3 className="text-emerald-400 font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-3">{item.description}</p>
                  
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
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-lg text-sm transition flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

