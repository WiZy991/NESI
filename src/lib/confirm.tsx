'use client'

import { useConfirmDialog } from '@/hooks/useConfirmDialog'

/**
 * Хелпер для использования диалога подтверждения
 * Использование:
 * const { confirm, Dialog } = useConfirm()
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     message: 'Вы уверены, что хотите удалить?',
 *     type: 'danger',
 *     onConfirm: async () => {
 *       // действие
 *     }
 *   })
 * }
 */
export function useConfirm() {
  return useConfirmDialog()
}

