import { useState, useEffect, useCallback } from 'react'

const SEARCH_HISTORY_KEY = 'nesi_search_history'
const MAX_HISTORY_ITEMS = 10

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([])

  // Загружаем историю при монтировании
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки истории поиска:', error)
    }
  }, [])

  // Сохраняем историю в localStorage
  const saveHistory = useCallback((newHistory: string[]) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      setHistory(newHistory)
    } catch (error) {
      console.error('Ошибка сохранения истории поиска:', error)
    }
  }, [])

  // Добавить запрос в историю
  const addToHistory = useCallback((query: string) => {
    if (!query || !query.trim()) return

    const trimmedQuery = query.trim()
    setHistory(prev => {
      // Удаляем дубликаты
      const filtered = prev.filter(item => item.toLowerCase() !== trimmedQuery.toLowerCase())
      // Добавляем в начало
      const newHistory = [trimmedQuery, ...filtered].slice(0, MAX_HISTORY_ITEMS)
      saveHistory(newHistory)
      return newHistory
    })
  }, [saveHistory])

  // Удалить запрос из истории
  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item !== query)
      saveHistory(newHistory)
      return newHistory
    })
  }, [saveHistory])

  // Очистить всю историю
  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY)
      setHistory([])
    } catch (error) {
      console.error('Ошибка очистки истории поиска:', error)
    }
  }, [])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  }
}

