/**
 * Скрипт для проверки конфигурации Т-Банк Мультирасчеты
 *
 * Запуск: npx ts-node scripts/check-tbank-config.ts
 */

import dotenv from 'dotenv'
import path from 'path'

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('╔═══════════════════════════════════════════════════════╗')
console.log('║   Проверка конфигурации Т-Банк Мультирасчеты          ║')
console.log('╚═══════════════════════════════════════════════════════╝')
console.log('')

const checks = [
	{
		name: 'TBANK_TERMINAL_KEY',
		value: process.env.TBANK_TERMINAL_KEY,
		required: true,
	},
	{
		name: 'TBANK_TERMINAL_PASSWORD',
		value: process.env.TBANK_TERMINAL_PASSWORD,
		required: true,
		secret: true,
	},
	{
		name: 'TBANK_E2C_TERMINAL_KEY',
		value: process.env.TBANK_E2C_TERMINAL_KEY,
		required: true,
	},
	{
		name: 'TBANK_E2C_TERMINAL_PASSWORD',
		value: process.env.TBANK_E2C_TERMINAL_PASSWORD,
		required: true,
		secret: true,
	},
	{
		name: 'TBANK_MODE',
		value: process.env.TBANK_MODE || 'test',
		required: false,
	},
	{
		name: 'NEXT_PUBLIC_BASE_URL',
		value: process.env.NEXT_PUBLIC_BASE_URL,
		required: true,
	},
	{
		name: 'DATABASE_URL',
		value: process.env.DATABASE_URL,
		required: true,
		secret: true,
	},
]

let allValid = true

checks.forEach(check => {
	const status = check.value ? '✅' : check.required ? '❌' : '⚠️'
	const displayValue =
		check.secret && check.value
			? '***' + check.value.slice(-4)
			: check.value || 'не задано'

	console.log(`${status} ${check.name}: ${displayValue}`)

	if (check.required && !check.value) {
		allValid = false
	}
})

console.log('')
console.log('─────────────────────────────────────────────────────────')
console.log('')

if (allValid) {
	console.log('✅ Конфигурация корректна!')
	console.log('')
	console.log('Режим работы:', process.env.TBANK_MODE || 'test')
	console.log(
		'API URL:',
		process.env.TBANK_MODE === 'production'
			? 'https://securepay.tinkoff.ru'
			: 'https://rest-api-test.tinkoff.ru'
	)
	const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nesi.su'
	console.log('Webhook URL:', `${webhookUrl}/api/tbank/webhook`)
	console.log('')
	console.log('🌐 Настройте этот URL в ЛК Т-Банка (business.tbank.ru)')
	console.log('')
	console.log('📋 Следующие шаги:')
	console.log('1. Настройте Notification URL в ЛК Т-Банка')
	console.log('2. Примените миграцию: npx prisma migrate deploy (на сервере)')
	console.log('3. Пересоберите: npm run build')
	console.log('4. Перезапустите: pm2 restart nesi')
	console.log('5. Откройте https://nesi.su/profile и протестируйте')
} else {
	console.log('❌ Конфигурация неполная!')
	console.log('')
	console.log('📝 Необходимо:')
	checks.forEach(check => {
		if (check.required && !check.value) {
			console.log(`   - Добавить ${check.name} в .env`)
		}
	})
	console.log('')
	console.log('📖 См. документацию: APPLY_TBANK_INTEGRATION.md')
	process.exit(1)
}

console.log('')
console.log('═══════════════════════════════════════════════════════')
