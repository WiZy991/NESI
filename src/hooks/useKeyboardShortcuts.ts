import { useEffect } from 'react'

type Shortcut = {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  callback: () => void
  description?: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем, если пользователь вводит текст в input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Исключение: Ctrl+K или / работает всегда
        if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
          // Разрешаем эти горячие клавиши
        } else {
          return
        }
      }

      shortcuts.forEach((shortcut) => {
        if (
          shortcut.key.toLowerCase() === e.key.toLowerCase() &&
          (shortcut.ctrlKey ?? false) === (e.ctrlKey || e.metaKey) &&
          (shortcut.shiftKey ?? false) === e.shiftKey &&
          (shortcut.altKey ?? false) === e.altKey
        ) {
          e.preventDefault()
          shortcut.callback()
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

