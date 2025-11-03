'use client'

import { useState } from 'react'
import { useTaskTemplates, type TaskTemplate } from '@/hooks/useTaskTemplates'
import { Trash2, FileText, X } from 'lucide-react'

type TaskTemplatesProps = {
  onSelectTemplate: (template: TaskTemplate) => void
  currentData: {
    title: string
    description: string
    categoryId: string
    subcategoryId: string
  }
}

export default function TaskTemplates({
  onSelectTemplate,
  currentData,
}: TaskTemplatesProps) {
  const { templates, deleteTemplate } = useTaskTemplates()
  const [isOpen, setIsOpen] = useState(false)

  if (templates.length === 0 && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-emerald-400 hover:text-emerald-300 transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 rounded"
        type="button"
        aria-label="Открыть шаблоны задач"
      >
        <FileText className="w-4 h-4" aria-hidden="true" />
        <span>Шаблоны</span>
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-emerald-400 hover:text-emerald-300 transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 rounded"
        type="button"
        aria-label={`Открыть шаблоны задач (${templates.length} сохранено)`}
        aria-expanded={isOpen}
      >
        <FileText className="w-4 h-4" aria-hidden="true" />
        <span>Шаблоны ({templates.length})</span>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-80 bg-[#001a12]/95 border border-emerald-700 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] backdrop-blur-md z-50 animate-fade-in"
          role="dialog"
          aria-modal="false"
          aria-labelledby="templates-title"
        >
          <div className="p-3 border-b border-emerald-700/50 flex items-center justify-between">
            <h3 id="templates-title" className="text-emerald-400 font-medium text-sm">Шаблоны задач</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              type="button"
              aria-label="Закрыть список шаблонов"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {templates.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 text-center">
                Нет сохраненных шаблонов
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 border-b border-emerald-700/30 hover:bg-emerald-700/10 transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => {
                        onSelectTemplate(template)
                        setIsOpen(false)
                      }}
                      className="flex-1 text-left focus:outline-none focus:ring-2 focus:ring-emerald-400/50 rounded p-1"
                      type="button"
                      aria-label={`Использовать шаблон: ${template.name}`}
                    >
                      <p className="text-white font-medium text-sm mb-1">
                        {template.name}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {template.title}
                      </p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Удалить шаблон?')) {
                          deleteTemplate(template.id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 p-1"
                      type="button"
                      aria-label="Удалить шаблон"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function SaveTemplateButton({
  currentData,
  onSaved,
}: {
  currentData: {
    title: string
    description: string
    categoryId: string
    subcategoryId: string
  }
  onSaved?: () => void
}) {
  const { saveTemplate } = useTaskTemplates()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const canSave =
    currentData.title.trim() &&
    currentData.description.trim() &&
    currentData.subcategoryId

  const handleSave = () => {
    if (!templateName.trim()) {
      alert('Введите название шаблона')
      return
    }

    if (!canSave) {
      alert('Заполните все обязательные поля перед сохранением шаблона')
      return
    }

    saveTemplate({
      name: templateName.trim(),
      title: currentData.title,
      description: currentData.description,
      categoryId: currentData.categoryId,
      subcategoryId: currentData.subcategoryId,
    })

    setTemplateName('')
    setIsModalOpen(false)
    onSaved?.()
  }

  if (!canSave) return null

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
        type="button"
      >
        <FileText className="w-3 h-3" />
        <span>Сохранить как шаблон</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#001a12] border border-emerald-700 rounded-xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <h3 className="text-emerald-400 font-semibold text-lg mb-4">
              Сохранить шаблон
            </h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона (например: Разработка сайта)"
              className="w-full p-3 rounded-lg bg-black/60 border border-emerald-700 text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 outline-none transition mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                } else if (e.key === 'Escape') {
                  setIsModalOpen(false)
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                type="button"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                type="button"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

