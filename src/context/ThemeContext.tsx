'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'auto'

type ThemeContextType = {
  theme: Theme
  effectiveTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark')

  // Загружаем сохраненную тему при монтировании
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedTheme = localStorage.getItem('nesi_theme') as Theme | null
    if (savedTheme && ['dark', 'auto'].includes(savedTheme)) {
      setThemeState(savedTheme)
    }
  }, [])

  // Вычисляем эффективную тему
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateEffectiveTheme = () => {
      if (theme === 'auto') {
        // В авто режиме всегда используем темную тему (так как светлой нет)
        setEffectiveTheme('dark')
      } else {
        setEffectiveTheme(theme)
      }
    }

    updateEffectiveTheme()

    // Применяем тему к документу (всегда темная)
    const root = document.documentElement
    root.classList.add('dark')
    root.classList.remove('light')

    // Слушаем изменения системной темы для режима 'auto'
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateEffectiveTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, effectiveTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nesi_theme', newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

