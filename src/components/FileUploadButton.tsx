'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function FileUploadButton({
  onUpload,
}: {
  onUpload: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowed.includes(file.type)) {
      toast.error('Недопустимый формат файла')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс 10МБ)')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    toast.loading('Загрузка файла...')

    try {
      const res = await fetch('/api/upload/chat-file', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      onUpload(data.url)
      toast.success('Файл загружен')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  return (
    <label className="cursor-pointer inline-block px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">
      📎 Прикрепить файл
      <input
        type="file"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
    </label>
  )
}
