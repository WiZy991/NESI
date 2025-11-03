import { useEffect, useRef } from 'react'

export function useAutoSave<T>(
  data: T,
  key: string,
  interval: number = 30000
) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedRef = useRef<string>('')
  
  useEffect(() => {
    const currentData = JSON.stringify(data)
    
    // Сохраняем только если данные изменились и не пустые
    if (currentData !== lastSavedRef.current && currentData !== '{}') {
      // Очищаем предыдущий таймер
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Устанавливаем новый таймер
      timeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(`draft_${key}`, currentData)
          lastSavedRef.current = currentData
        } catch (error) {
          console.error('Ошибка сохранения черновика:', error)
        }
      }, interval)
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, key, interval])
  
  // Функция для загрузки черновика
  const loadDraft = (): T | null => {
    try {
      const saved = localStorage.getItem(`draft_${key}`)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }
  
  // Функция для удаления черновика
  const clearDraft = () => {
    try {
      localStorage.removeItem(`draft_${key}`)
      lastSavedRef.current = ''
    } catch {
      // Игнорируем ошибки
    }
  }
  
  return { loadDraft, clearDraft }
}

