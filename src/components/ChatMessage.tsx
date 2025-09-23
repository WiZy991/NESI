'use client'

type Props = {
  message: {
    id: string
    content: string
    createdAt: string
    fileId?: string
    fileName?: string
    fileMimetype?: string
    sender: {
      id: string
      fullName?: string
      email: string
    }
  }
}

export default function ChatMessage({ message }: Props) {
  const fileUrl = message.fileId ? `/api/files/${message.fileId}` : null
  const isImage = message.fileMimetype?.startsWith('image/')

  return (
    <div className="bg-gray-800 p-2 rounded text-sm">
      <div className="font-semibold mb-1">
        {message.sender.fullName || message.sender.email}
        <span className="text-xs text-gray-400 ml-2">
          {new Date(message.createdAt).toLocaleString()}
        </span>
      </div>

      {message.content && (
        <div className="text-white whitespace-pre-line">{message.content}</div>
      )}

      {fileUrl && (
        <div className="mt-2">
          {isImage ? (
            <img
              src={fileUrl}
              alt={message.fileName || 'Вложение'}
              className="max-w-xs max-h-64 rounded border"
            />
          ) : (
            <a
              href={fileUrl}
              download={message.fileName}
              className="text-blue-400 underline inline-block mt-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              📎 {message.fileName || 'Скачать файл'}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
