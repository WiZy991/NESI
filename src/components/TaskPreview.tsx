'use client'

import { X, Calendar, User, Folder, File } from 'lucide-react'

type TaskPreviewProps = {
  title: string
  description: string
  categoryName?: string
  subcategoryName?: string
  files: File[]
  onClose: () => void
}

export default function TaskPreview({
  title,
  description,
  categoryName,
  subcategoryName,
  files,
  onClose,
}: TaskPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-black/90 via-gray-900 to-black/90 border border-emerald-500/30 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-emerald-500/30 p-6 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-emerald-400">Предпросмотр задачи</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-2 hover:bg-gray-800 rounded-lg"
            aria-label="Закрыть предпросмотр"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Заголовок */}
          <div>
            <h1 className="text-3xl font-bold text-emerald-200 mb-2">{title || 'Название задачи'}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>

          {/* Категории */}
          {(categoryName || subcategoryName) && (
            <div className="flex flex-wrap gap-2">
              {categoryName && (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm">
                  <Folder className="w-4 h-4" />
                  {categoryName}
                </span>
              )}
              {subcategoryName && (
                <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm">
                  {subcategoryName}
                </span>
              )}
            </div>
          )}

          {/* Описание */}
          <div className="prose prose-invert max-w-none">
            <h3 className="text-xl font-semibold text-emerald-400 mb-3">Описание</h3>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {description || 'Описание задачи будет здесь...'}
              </p>
            </div>
          </div>

          {/* Файлы */}
          {files.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-emerald-400 mb-3">Прикрепленные файлы</h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                  >
                    <File className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm truncate">{file.name}</p>
                      <p className="text-gray-500 text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-sm text-gray-500 text-center">
              Это предпросмотр задачи. После создания вы сможете редактировать её при необходимости.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

