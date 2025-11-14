import prisma from '@/lib/prisma'
import { canTakeMoreTasks } from '@/lib/level/taskLimit'

/**
 * Возвращает true, если у исполнителя есть активная задача.
 * Под "активной" считаем status = 'in_progress'.
 * @deprecated Используйте canTakeMoreTasks для проверки лимита задач
 */
export async function hasActiveTask(executorId: string) {
  const count = await prisma.task.count({
    where: {
      executorId,
      status: 'in_progress',
    },
  })
  return count > 0
}

/**
 * Проверяет, может ли исполнитель взять еще задачи (с учетом лимита по уровню)
 */
export async function canExecutorTakeTask(executorId: string): Promise<boolean> {
  const result = await canTakeMoreTasks(executorId)
  return result.canTake
}
