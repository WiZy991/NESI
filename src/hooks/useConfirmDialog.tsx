'use client'

import { useState, useCallback } from 'react'
import ConfirmDialog, { type ConfirmDialogType } from '@/components/ConfirmDialog'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmDialogType
  onConfirm?: () => void | Promise<void>
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    type: ConfirmDialogType
    onConfirm: () => void | Promise<void>
  }>({
    isOpen: false,
    title: 'Подтверждение',
    message: '',
    confirmText: 'Подтвердить',
    cancelText: 'Отмена',
    type: 'danger',
    onConfirm: () => {},
  })

  const [isLoading, setIsLoading] = useState(false)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      // Гарантируем, что message всегда строка
      let messageStr = options.message
      if (typeof messageStr !== 'string') {
        if (messageStr == null) {
          messageStr = ''
        } else if (typeof messageStr === 'object') {
          // Пытаемся извлечь читаемое сообщение из объекта
          if ('message' in messageStr && typeof messageStr.message === 'string') {
            messageStr = messageStr.message
          } else if ('error' in messageStr && typeof messageStr.error === 'string') {
            messageStr = messageStr.error
          } else {
            try {
              const stringified = JSON.stringify(messageStr)
              messageStr = stringified === '{}' || stringified.includes('[object Object]') 
                ? 'Произошла ошибка' 
                : stringified
            } catch {
              messageStr = 'Произошла ошибка'
            }
          }
        } else {
          messageStr = String(messageStr)
        }
      }
      
      setDialogState({
        isOpen: true,
        title: options.title || 'Подтверждение',
        message: messageStr,
        confirmText: options.confirmText || 'Подтвердить',
        cancelText: options.cancelText || 'Отмена',
        type: options.type || 'danger',
        onConfirm: async () => {
          setIsLoading(true)
          try {
            if (options.onConfirm) {
              await options.onConfirm()
            }
            setDialogState((prev) => ({ ...prev, isOpen: false }))
            resolve(true)
          } catch (error: any) {
            console.error('Ошибка в подтверждении:', error)
            // Ошибка уже обработана в onConfirm, просто закрываем диалог
            setDialogState((prev) => ({ ...prev, isOpen: false }))
            resolve(false)
          } finally {
            setIsLoading(false)
          }
        },
      })
    })
  }, [])

  const close = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }))
    setIsLoading(false)
  }, [])

  const Dialog = (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onClose={close}
      onConfirm={dialogState.onConfirm}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      type={dialogState.type}
      isLoading={isLoading}
    />
  )

  return { confirm, Dialog }
}

