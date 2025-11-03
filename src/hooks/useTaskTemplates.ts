// Хук для работы с шаблонами задач (localStorage)
import { useState, useEffect } from 'react'

export type TaskTemplate = {
  id: string
  name: string
  title: string
  description: string
  categoryId: string
  subcategoryId: string
  createdAt: number
}

const STORAGE_KEY = 'task_templates'

export function useTaskTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])

  useEffect(() => {
    // Загружаем шаблоны из localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setTemplates(JSON.parse(stored))
      } catch {
        setTemplates([])
      }
    }
  }, [])

  const saveTemplate = (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: TaskTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: Date.now(),
    }
    const updated = [...templates, newTemplate]
    setTemplates(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return newTemplate
  }

  const deleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id)
    setTemplates(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const getTemplate = (id: string) => {
    return templates.find((t) => t.id === id)
  }

  return {
    templates,
    saveTemplate,
    deleteTemplate,
    getTemplate,
  }
}

