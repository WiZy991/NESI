'use client'

import { useUser } from '@/context/UserContext'
import ProtectedPage from '@/components/ProtectedPage'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function EditProfilePage() {
  const { user, token, login, loading } = useUser()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'customer' | 'executor'>('customer')
  const [password, setPassword] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setRole(user.role || 'customer')
      setDescription(user.description || '')
      setLocation(user.location || '')
      setSkills(Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || '')
    }
  }, [user])

  const handleSave = async () => {
    if (!token) return toast.error('Нет токена авторизации')
    if (!fullName.trim()) return toast.error('Имя не может быть пустым')

    setSaving(true)
    const toastId = toast.loading('Сохраняем профиль...')

    try {
      const formData = new FormData()
      formData.append('fullName', fullName)
      formData.append('role', role)
      if (password) formData.append('password', password)
      formData.append('description', description)
      formData.append('location', location)
      formData.append('skills', skills)
      if (avatarFile) formData.append('avatar', avatarFile)

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка при сохранении')

      login(data.user, token)
      toast.success('Профиль обновлён', { id: toastId })
      router.push('/profile')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сервера', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) return <div className="p-6 text-gray-400">Загрузка...</div>

  return (
    <ProtectedPage>
      <div className="p-6 max-w-xl mx-auto space-y-6 bg-black/40 border border-emerald-500/30 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        <h1 className="text-2xl font-bold text-emerald-400 mb-4">✏️ Редактировать профиль</h1>

        {/* Имя */}
        <div>
          <label className="block mb-1 text-gray-300">Имя</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Роль */}
        <div className="relative">
          <label className="block mb-1 text-gray-300">Роль</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'customer' | 'executor')}
            className="w-full px-3 py-2 bg-black text-emerald-400 border border-emerald-500/50 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400 
                       appearance-none shadow-[0_0_10px_rgba(16,185,129,0.4)]"
          >
            <option value="customer" className="bg-black text-emerald-400">
              Заказчик
            </option>
            <option value="executor" className="bg-black text-emerald-400">
              Исполнитель
            </option>
          </select>
          <span className="absolute right-3 top-9 pointer-events-none text-emerald-400">▼</span>
        </div>

        {/* Пароль */}
        <div>
          <label className="block mb-1 text-gray-300">Новый пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Описание */}
        <div>
          <label className="block mb-1 text-gray-300">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Аватар */}
        <div>
          <label className="block mb-1 text-gray-300">Аватар (изображение)</label>
          <label
            htmlFor="avatar-upload"
            className="cursor-pointer inline-block px-3 py-2 rounded-lg border border-emerald-400 
                       text-emerald-400 hover:bg-emerald-400 hover:text-black transition"
          >
            📷 Загрузить аватар
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setAvatarFile(e.target.files[0])
              }
            }}
            className="hidden"
          />
          {avatarFile && (
            <p className="text-xs text-emerald-400 mt-1">Выбран: {avatarFile.name}</p>
          )}
        </div>

        {/* Город */}
        <div>
          <label className="block mb-1 text-gray-300">Город</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Навыки */}
        <div>
          <label className="block mb-1 text-gray-300">Навыки (через запятую)</label>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border border-emerald-500/30 rounded-lg text-white 
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Сохранить */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg border border-emerald-400 text-emerald-400 
                     hover:bg-emerald-400 hover:text-black transition disabled:opacity-50"
        >
          {saving ? 'Сохраняем...' : '💾 Сохранить'}
        </button>
      </div>
    </ProtectedPage>
  )
}
