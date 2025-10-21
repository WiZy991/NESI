'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, Save, Bell, CheckCircle, XCircle } from 'lucide-react'

export default function SettingsPage() {
  const { token, user } = useUser()

  const [form, setForm] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
  })

  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
  })

  // === уведомления (тосты) ===
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | null } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  // === загрузка настроек ===
  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const data = await res.json()
        if (res.ok) setSettings(data)
        else showToast('Ошибка при загрузке настроек', 'error')
      } catch {
        showToast('Не удалось подключиться к серверу', 'error')
      }
    })()
  }, [token])

  // === смена пароля ===
  const handleChangePassword = async () => {
    if (!passwords.old || !passwords.new) {
      showToast('Укажите старый и новый пароль', 'error')
      return
    }

    try {
      const res = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwords),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Пароль успешно изменён ✅', 'success')
        setPasswords({ old: '', new: '' })
      } else {
        showToast(data.error || 'Ошибка при смене пароля', 'error')
      }
    } catch {
      showToast('Ошибка соединения с сервером', 'error')
    }
  }

  // === сохранение настроек ===
  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (res.ok) showToast('Настройки сохранены ✅', 'success')
      else showToast(data.error || 'Ошибка при сохранении', 'error')
    } catch {
      showToast('Нет соединения с сервером', 'error')
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-16 p-6 text-white">
      {/* === Toast === */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -30, x: 30 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-emerald-600/90' : 'bg-red-600/90'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <XCircle className="w-5 h-5 text-white" />
            )}
            <p className="text-sm">{toast.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Заголовок === */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-bold text-emerald-400 mb-10 text-center"
      >
        ⚙️ Настройки профиля
      </motion.h1>

      <div className="space-y-8">
        {/* 🧍 Аккаунт */}
        <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,150,0.1)]">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" /> Аккаунт
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Имя</label>
              <input
                type="text"
                value={form.name}
                readOnly
                className="w-full mt-1 p-2 bg-black/40 border border-emerald-500/30 rounded-lg text-sm text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Email</label>
              <input
                type="email"
                value={form.email}
                readOnly
                className="w-full mt-1 p-2 bg-black/40 border border-emerald-500/30 rounded-lg text-sm text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* 🔐 Смена пароля */}
            <div className="mt-5">
              <label className="text-sm text-gray-400">Сменить пароль</label>
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                <input
                  type="password"
                  placeholder="Старый пароль"
                  value={passwords.old}
                  onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
                  className="p-2 bg-black/40 border border-gray-700 rounded-lg text-sm"
                />
                <input
                  type="password"
                  placeholder="Новый пароль"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="p-2 bg-black/40 border border-gray-700 rounded-lg text-sm"
                />
              </div>

              <button
                onClick={handleChangePassword}
                className="mt-3 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-sm transition flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Сменить пароль
              </button>
            </div>
          </div>
        </section>

        {/* 🔔 Уведомления */}
        <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Уведомления
          </h2>

          <div className="flex flex-col gap-4 text-sm">
            <label className="flex justify-between items-center">
              <span>Email-уведомления:</span>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, emailNotifications: e.target.checked })
                }
                className="accent-emerald-500 w-4 h-4"
              />
            </label>
            <label className="flex justify-between items-center">
              <span>Push-уведомления:</span>
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={(e) =>
                  setSettings({ ...settings, pushNotifications: e.target.checked })
                }
                className="accent-emerald-500 w-4 h-4"
              />
            </label>
          </div>
        </section>
      </div>

      {/* 💾 Сохранить */}
      <div className="text-center mt-10">
        <button
          onClick={handleSave}
          className="bg-emerald-600/80 hover:bg-emerald-600 px-6 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto"
        >
          <Save className="w-4 h-4" /> Сохранить изменения
        </button>
      </div>
    </div>
  )
}
