// Скрипт для автоматического применения изменений схемы базы данных
// Этот файл будет запускаться при старте сервера

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureDatabaseSchema() {
	try {
		console.log('🔍 Проверяем схему базы данных...')

		// Проверяем существование колонки last_private_message_read_at в таблице User
		const userTableInfo = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'last_private_message_read_at'
    `

		if (!userTableInfo || (userTableInfo as any[]).length === 0) {
			console.log(
				'📝 Добавляем колонку last_private_message_read_at в таблицу User...'
			)
			await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "last_private_message_read_at" TIMESTAMP(3)
      `
		}

		// Проверяем существование колонок в таблице Task
		const taskTableInfo = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Task' 
      AND column_name IN ('customer_last_read_at', 'executor_last_read_at')
    `

		const existingColumns = (taskTableInfo as any[]).map(
			(row: any) => row.column_name
		)

		if (!existingColumns.includes('customer_last_read_at')) {
			console.log(
				'📝 Добавляем колонку customer_last_read_at в таблицу Task...'
			)
			await prisma.$executeRaw`
        ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "customer_last_read_at" TIMESTAMP(3)
      `
		}

		if (!existingColumns.includes('executor_last_read_at')) {
			console.log(
				'📝 Добавляем колонку executor_last_read_at в таблицу Task...'
			)
			await prisma.$executeRaw`
        ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "executor_last_read_at" TIMESTAMP(3)
      `
		}

		console.log('✅ Схема базы данных актуальна')
	} catch (error) {
		console.error('❌ Ошибка при проверке схемы базы данных:', error)
	} finally {
		await prisma.$disconnect()
	}
}

// Экспортируем функцию для использования в других файлах
export { ensureDatabaseSchema }

// Если файл запускается напрямую, выполняем проверку
if (require.main === module) {
	ensureDatabaseSchema()
}
