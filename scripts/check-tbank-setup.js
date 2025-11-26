#!/usr/bin/env node

/**
 * Скрипт для проверки настройки Т-Банк Мультирасчеты
 * Проверяет переменные окружения, БД, доступность API
 */

const { PrismaClient } = require('@prisma/client')
const https = require('https')
const http = require('http')

const prisma = new PrismaClient()

// Цвета для консоли
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
}

function log(message, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
	log(`✅ ${message}`, colors.green)
}

function error(message) {
	log(`❌ ${message}`, colors.red)
}

function warning(message) {
	log(`⚠️  ${message}`, colors.yellow)
}

function info(message) {
	log(`ℹ️  ${message}`, colors.cyan)
}

function header(message) {
	console.log()
	log(`═══════════════════════════════════════`, colors.blue)
	log(`  ${message}`, colors.blue)
	log(`═══════════════════════════════════════`, colors.blue)
	console.log()
}

// 1. Проверка переменных окружения
async function checkEnvVariables() {
	header('1. Проверка переменных окружения')

	const requiredVars = [
		'TBANK_TERMINAL_KEY',
		'TBANK_PASSWORD',
		'NEXT_PUBLIC_APP_URL',
		'DATABASE_URL',
	]

	const optionalVars = ['TBANK_E2C_TERMINAL_KEY', 'TBANK_API_URL']

	let allRequired = true

	requiredVars.forEach(varName => {
		if (process.env[varName]) {
			success(
				`${varName}: установлена (${process.env[varName].substring(0, 10)}...)`
			)
		} else {
			error(`${varName}: НЕ УСТАНОВЛЕНА`)
			allRequired = false
		}
	})

	console.log()
	info('Опциональные переменные:')
	optionalVars.forEach(varName => {
		if (process.env[varName]) {
			success(
				`${varName}: установлена (${process.env[varName].substring(0, 10)}...)`
			)
		} else {
			warning(`${varName}: не установлена (будет использоваться по умолчанию)`)
		}
	})

	return allRequired
}

// 2. Проверка структуры БД
async function checkDatabase() {
	header('2. Проверка структуры базы данных')

	try {
		// Проверяем подключение к БД
		await prisma.$connect()
		success('Подключение к БД установлено')

		// Проверяем наличие таблицы Transaction
		const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'Transaction'
      ) as exists;
    `

		if (tableExists[0].exists) {
			success('Таблица Transaction существует')
		} else {
			error('Таблица Transaction не найдена')
			return false
		}

		// Проверяем наличие полей dealId и paymentId
		const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Transaction'
        AND column_name IN ('dealId', 'paymentId')
      ORDER BY column_name;
    `

		const dealIdColumn = columns.find(col => col.column_name === 'dealId')
		const paymentIdColumn = columns.find(col => col.column_name === 'paymentId')

		if (dealIdColumn) {
			success(
				`Поле dealId: существует (${dealIdColumn.data_type}, nullable: ${dealIdColumn.is_nullable})`
			)
		} else {
			error('Поле dealId: НЕ НАЙДЕНО')
			warning('  → Необходимо применить миграцию БД')
			return false
		}

		if (paymentIdColumn) {
			success(
				`Поле paymentId: существует (${paymentIdColumn.data_type}, nullable: ${paymentIdColumn.is_nullable})`
			)
		} else {
			error('Поле paymentId: НЕ НАЙДЕНО')
			warning('  → Необходимо применить миграцию БД')
			return false
		}

		// Проверяем наличие транзакций с DealId
		const txWithDealId = await prisma.transaction.count({
			where: {
				type: 'deposit',
				dealId: { not: null },
			},
		})

		if (txWithDealId > 0) {
			success(`Найдено транзакций с DealId: ${txWithDealId}`)
		} else {
			warning('Транзакций с DealId не найдено')
			info('  → Это нормально, если еще не было пополнений')
		}

		return true
	} catch (err) {
		error(`Ошибка проверки БД: ${err.message}`)
		return false
	}
}

// 3. Проверка доступности API Т-Банка
async function checkTBankAPI() {
	header('3. Проверка доступности API Т-Банка')

	const apiUrl = process.env.TBANK_API_URL || 'https://securepay.tinkoff.ru'
	const testApiUrl =
		process.env.NODE_ENV === 'production'
			? apiUrl
			: 'https://rest-api-test.tinkoff.ru'

	info(`Проверяем API: ${testApiUrl}`)

	return new Promise(resolve => {
		const protocol = testApiUrl.startsWith('https') ? https : http
		const req = protocol.get(testApiUrl, res => {
			if (res.statusCode === 200 || res.statusCode === 404) {
				success(`API Т-Банка доступен (статус: ${res.statusCode})`)
				resolve(true)
			} else {
				warning(`API Т-Банка вернул статус: ${res.statusCode}`)
				resolve(false)
			}
		})

		req.on('error', err => {
			error(`Не удалось подключиться к API Т-Банка: ${err.message}`)
			resolve(false)
		})

		req.setTimeout(5000, () => {
			error('Превышено время ожидания ответа от API Т-Банка')
			req.destroy()
			resolve(false)
		})
	})
}

// 4. Проверка доступности вебхука
async function checkWebhook() {
	header('4. Проверка доступности вебхука')

	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
	const webhookUrl = `${appUrl}/api/wallet/tbank/webhook`

	info(`Проверяем вебхук: ${webhookUrl}`)

	return new Promise(resolve => {
		const protocol = webhookUrl.startsWith('https') ? https : http
		const req = protocol.get(webhookUrl, res => {
			if (res.statusCode === 200) {
				success(`Вебхук доступен (статус: ${res.statusCode})`)

				let data = ''
				res.on('data', chunk => {
					data += chunk
				})
				res.on('end', () => {
					try {
						const json = JSON.parse(data)
						if (json.status === 'ok') {
							success(`Вебхук отвечает корректно`)
						}
					} catch (err) {
						warning('Не удалось распарсить ответ вебхука')
					}
					resolve(true)
				})
			} else {
				error(`Вебхук вернул статус: ${res.statusCode}`)
				resolve(false)
			}
		})

		req.on('error', err => {
			error(`Не удалось подключиться к вебхуку: ${err.message}`)
			warning(
				'  → Это нормально, если приложение не запущено или не доступно извне'
			)
			resolve(false)
		})

		req.setTimeout(5000, () => {
			error('Превышено время ожидания ответа от вебхука')
			req.destroy()
			resolve(false)
		})
	})
}

// Главная функция
async function main() {
	console.clear()
	log('╔═══════════════════════════════════════════════════╗', colors.blue)
	log('║   Проверка настройки Т-Банк Мультирасчеты        ║', colors.blue)
	log('╚═══════════════════════════════════════════════════╝', colors.blue)
	console.log()

	const results = {
		env: false,
		db: false,
		api: false,
		webhook: false,
	}

	// Проверяем все компоненты
	results.env = await checkEnvVariables()
	results.db = await checkDatabase()
	results.api = await checkTBankAPI()
	results.webhook = await checkWebhook()

	// Итоговый отчет
	header('ИТОГОВЫЙ ОТЧЕТ')

	const allPassed = Object.values(results).every(v => v === true)

	if (allPassed) {
		success('ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! ✨')
		console.log()
		info('Система готова к работе с Т-Банк Мультирасчеты')
	} else {
		error('НЕКОТОРЫЕ ПРОВЕРКИ НЕ ПРОШЛИ')
		console.log()
		warning('Необходимо устранить ошибки:')
		console.log()

		if (!results.env) {
			error('  1. Настройте переменные окружения')
			info('     → Создайте файл .env с ключами Т-Банка')
		}

		if (!results.db) {
			error('  2. Примените миграцию БД')
			info('     → Выполните: npx prisma migrate deploy')
			info(
				'     → Или вручную: psql $DATABASE_URL -f apply_dealid_migration.sql'
			)
		}

		if (!results.api) {
			warning('  3. API Т-Банка недоступен')
			info('     → Проверьте интернет-соединение')
			info('     → Проверьте файрвол')
		}

		if (!results.webhook) {
			warning('  4. Вебхук недоступен')
			info('     → Убедитесь, что приложение запущено')
			info('     → Проверьте настройки nginx/apache')
			info('     → Настройте вебхук в личном кабинете Т-Банка')
		}
	}

	console.log()
	log('════════════════════════════════════════════════════', colors.blue)
	console.log()

	// Закрываем подключение к БД
	await prisma.$disconnect()

	process.exit(allPassed ? 0 : 1)
}

// Запуск
main().catch(err => {
	console.error('Критическая ошибка:', err)
	process.exit(1)
})
