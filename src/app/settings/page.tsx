'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Save, Bell, Eye, EyeOff, BookOpen } from 'lucide-react'
import { ResetOnboardingButton } from '@/components/ResetOnboardingButton'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
  })

  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
  })
  const [status, setStatus] = useState<string | null>(null)

  // === загрузка настроек ===
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/settings', {
          cache: 'no-store',
          credentials: 'include',
        })
        const data = await res.json()
        if (res.ok) {
          setSettings({
            emailNotifications: data.emailNotifications ?? true,
            pushNotifications: data.pushNotifications ?? false,
          })
        } else {
          setStatus(`⚠️ ${data.error || 'Ошибка загрузки настроек'}`)
        }
      } catch {
        setStatus('⚠️ Ошибка соединения с сервером')
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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oldPassword: passwords.old,
          newPassword: passwords.new,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setStatus('✅ Пароль успешно изменён')
        setPasswords({ old: '', new: '' })
      } else {
        setStatus(`❌ ${data.error || 'Ошибка при смене пароля'}`)
      }
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
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('✅ Настройки сохранены')
      } else {
        setStatus(`❌ ${data.error || 'Ошибка при сохранении настроек'}`)
      }
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
        ⚙️ Настройки
      </motion.h1>

      {/* 🔔 Уведомления */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm mb-8">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" /> Уведомления
        </h2>

        <div className="flex flex-col gap-4 text-sm">
          <label className="flex justify-between items-center">
            <span>Email-уведомления</span>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  emailNotifications: e.target.checked,
                })
              }
              className="accent-emerald-500 w-4 h-4"
            />
          </label>

          <label className="flex justify-between items-center">
            <span>Push-уведомления</span>
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  pushNotifications: e.target.checked,
                })
              }
              className="accent-emerald-500 w-4 h-4"
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          className="mt-5 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-sm flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Сохранить настройки
        </button>
      </section>

      {/* 🔐 Смена пароля */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" /> Смена пароля
        </h2>

        <div className="grid md:grid-cols-2 gap-3">
          {/* Старый пароль */}
          <div className="relative">
            <input
              type={showPassword.old ? 'text' : 'password'}
              placeholder="Старый пароль"
              value={passwords.old}
              onChange={(e) =>
                setPasswords({ ...passwords, old: e.target.value })
              }
              className="p-2 pr-10 w-full bg-black/40 border border-gray-700 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setShowPassword({ ...showPassword, old: !showPassword.old })
              }
              className="absolute right-3 top-2.5 text-gray-400 hover:text-emerald-400 transition"
            >
              {showPassword.old ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Новый пароль */}
          <div className="relative">
            <input
              type={showPassword.new ? 'text' : 'password'}
              placeholder="Новый пароль"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
              className="p-2 pr-10 w-full bg-black/40 border border-gray-700 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() =>
                setShowPassword({ ...showPassword, new: !showPassword.new })
              }
              className="absolute right-3 top-2.5 text-gray-400 hover:text-emerald-400 transition"
            >
              {showPassword.new ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          className="mt-3 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-sm flex items-center gap-2"
        >
          <Lock className="w-4 h-4" /> Изменить пароль
        </button>
      </section>

      {/* 📖 Повторный запуск онбординга */}
      <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm mt-8">
        <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Онбординг
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Хотите повторить интерактивный тур по платформе? Вы можете запустить его снова в любой момент.
        </p>
        <ResetOnboardingButton />
      </section>

      {/* 💬 статус */}
      {status && (
        <p className="text-sm text-gray-400 mt-6 text-center transition-opacity duration-300">
          {status}
        </p>
      )}
    </div>
  )
}
