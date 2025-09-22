'use client'

type Props = {
  message: {
    id: string
    content: string
    createdAt: string
    fileUrl?: string
    sender: {
      id: string
      fullName?: string
      email: string
    }
  }
}

export default function ChatMessage({ message }: Props) {
  const isImage = message.fileUrl?.match(/\.(png|jpe?g|gif|webp)$/i)

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

      {message.fileUrl && (
        <div className="mt-2">
          {isImage ? (
            <img
              src={message.fileUrl}
              alt="Вложение"
              className="max-w-xs max-h-64 rounded border"
            />
          ) : (
            <a
              href={message.fileUrl}
              download
              className="text-blue-400 underline inline-block mt-1"
            >
              📎 Скачать файл
            </a>
          )}
        </div>
      )}
    </div>
  )
}
