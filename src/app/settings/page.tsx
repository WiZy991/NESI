'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { motion } from 'framer-motion'
import { User, Lock, Save, Shield, Bell } from 'lucide-react'

export default function SettingsPage() {
  const { token, user } = useUser()

  const [form, setForm] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
  })
  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const [status, setStatus] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    showOnlineStatus: true,
    hideEmail: false,
  })

  // === загрузка настроек ===
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        const data = await res.json()
        if (res.ok) setSettings(data)
      } catch (e) {
        console.warn('Не удалось загрузить настройки')
      }
    })()
  }, [])

  // === смена пароля ===
  const handleChangePassword = async () => {
    if (!passwords.old || !passwords.new) {
      setStatus('⚠️ Укажите старый и новый пароль')
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
      if (res.ok) setStatus('✅ Пароль успешно изменён')
      else setStatus(`❌ ${data.error}`)
    } catch {
      setStatus('⚠️ Ошибка соединения с сервером')
    }
  }

  // === сохранение настроек ===
  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) setStatus('✅ Настройки сохранены')
      else setStatus('❌ Ошибка при сохранении')
    } catch {
      setStatus('⚠️ Нет соединения с сервером')
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-16 p-6 text-white">
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 p-2 bg-black/40 border border-emerald-500/30 rounded-lg text-sm focus:ring-1 focus:ring-emerald-400 outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 p-2 bg-black/40 border border-emerald-500/30 rounded-lg text-sm focus:ring-1 focus:ring-emerald-400 outline-none"
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
              {status && <p className="text-xs text-gray-400 mt-2">{status}</p>}
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

        {/* 🔒 Конфиденциальность */}
        <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Конфиденциальность
          </h2>

          <div className="flex flex-col gap-4 text-sm">
            <label className="flex justify-between items-center">
              <span>Показывать онлайн-статус:</span>
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) =>
                  setSettings({ ...settings, showOnlineStatus: e.target.checked })
                }
                className="accent-emerald-500 w-4 h-4"
              />
            </label>
            <label className="flex justify-between items-center">
              <span>Скрыть email от других:</span>
              <input
                type="checkbox"
                checked={settings.hideEmail}
                onChange={(e) => setSettings({ ...settings, hideEmail: e.target.checked })}
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
