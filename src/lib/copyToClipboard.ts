/**
 * Утилита для копирования текста в буфер обмена
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Используем современный Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        return successful
      } catch (err) {
        document.body.removeChild(textArea)
        return false
      }
    }
  } catch (error) {
    console.error('Ошибка при копировании в буфер обмена:', error)
    return false
  }
}

/**
 * Получить текущий URL страницы
 */
export function getCurrentUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.href
}

/**
 * Получить URL задачи
 */
export function getTaskUrl(taskId: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/tasks/${taskId}`
}

/**
 * Получить URL сообщения в чате
 */
export function getChatMessageUrl(chatType: 'private' | 'task', chatId: string, messageId?: string): string {
  if (typeof window === 'undefined') return ''
  const baseUrl = chatType === 'private' 
    ? `/messages/${chatId}`
    : `/tasks/${chatId}`
  return messageId ? `${baseUrl}#message-${messageId}` : `${window.location.origin}${baseUrl}`
}

