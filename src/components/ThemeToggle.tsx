'use client'

import { useTheme } from '@/context/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const themes: { value: 'dark' | 'auto'; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Темная', icon: <Moon className="w-4 h-4" /> },
    { value: 'auto', label: 'Авто (системная)', icon: <Monitor className="w-4 h-4" /> },
  ]

  const currentTheme = themes.find(t => t.value === theme) || themes[1]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-black/40 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all text-emerald-400"
        title="Переключить тему"
        aria-label="Переключить тему"
      >
        {currentTheme.icon}
      </button>

      {isOpen && (
        <>
          {/* Overlay для закрытия при клике вне */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Выпадающее меню */}
          <div className="absolute right-0 mt-2 w-40 bg-gray-900/95 backdrop-blur-sm border border-emerald-500/30 rounded-lg shadow-2xl z-50 overflow-hidden">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  theme === t.value
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-300'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {theme === t.value && (
                  <span className="ml-auto text-emerald-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

