'use client'

import { useState } from 'react'
import { useUser } from '@/context/UserContext'
import { motion } from 'framer-motion'
import { User, Lock, Save, Sun, Moon, Mail } from 'lucide-react'

export default function SettingsPage() {
  const { token, user } = useUser()

  // --- состояния ---
  const [form, setForm] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
  })
  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const [status, setStatus] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('dark')
  const [animations, setAnimations] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

  // --- смена пароля ---
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

        {/* 🎨 Интерфейс */}
        <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" /> Интерфейс
          </h2>

          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between items-center">
              <span>Тема интерфейса:</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-black/40 border border-emerald-500/30 rounded-lg px-3 py-1 text-sm"
              >
                <option value="dark">Тёмная</option>
                <option value="light">Светлая</option>
                <option value="auto">Авто</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <span>Анимации интерфейса:</span>
              <input
                type="checkbox"
                checked={animations}
                onChange={(e) => setAnimations(e.target.checked)}
                className="accent-emerald-500 w-4 h-4"
              />
            </div>
          </div>
        </section>

        {/* 🔔 Уведомления */}
        <section className="bg-black/50 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" /> Уведомления
          </h2>

          <div className="flex justify-between items-center text-sm">
            <span>Email-уведомления:</span>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="accent-emerald-500 w-4 h-4"
            />
          </div>
        </section>
      </div>

      {/* 💾 Сохранить */}
      <div className="text-center mt-10">
        <button className="bg-emerald-600/80 hover:bg-emerald-600 px-6 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto">
          <Save className="w-4 h-4" /> Сохранить изменения
        </button>
      </div>
    </div>
  )
}
