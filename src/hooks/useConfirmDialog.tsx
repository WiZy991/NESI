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
      setDialogState({
        isOpen: true,
        title: options.title || 'Подтверждение',
        message: options.message,
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
          } catch (error) {
            console.error('Ошибка в подтверждении:', error)
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

