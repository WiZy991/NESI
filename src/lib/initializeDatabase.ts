// Инициализация базы данных при запуске приложения
import { ensureDatabaseSchema } from '@/lib/ensureDatabaseSchema'

let isInitialized = false

export async function initializeDatabase() {
	if (isInitialized) {
		return
	}

	try {
		await ensureDatabaseSchema()
		isInitialized = true
		console.log('🚀 База данных инициализирована')
	} catch (error) {
		console.error('❌ Ошибка инициализации базы данных:', error)
	}
}
