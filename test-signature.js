/**
 * Скрипт для тестирования генерации подписи E2C
 * Запуск: node test-signature.js
 */

const crypto = require('crypto')

// Параметры из логов (строка 140589)
const requestBody = {
	TerminalKey: '1763372956356E2C',
	Amount: 10000,
	OrderId: 'withdraw_cmh4n1s4m0000v748r160zbdt_1763681250640',
	DealId: '56868517',
	PaymentRecipientId: '79662765973',
	Phone: '79662765973',
	SbpMemberId: 100000000004, // Number (согласно документации стр. 1083)
	FinalPayout: 'true', // Строка, а не boolean (согласно документации A2C_V2 стр. 903)
	NotificationURL: 'https://nesi.su/api/wallet/tbank/webhook',
}

// ВАЖНО: Замените на ваш реальный пароль E2C терминала
const E2C_PASSWORD = 'iGsy0RJ8%QqtBI3b'

console.log('📝 Параметры запроса:')
console.log(JSON.stringify(requestBody, null, 2))
console.log()

// Генерация токена по алгоритму Т-Банка
function generateToken(params, password) {
	const paramsWithPassword = {
		...params,
		Password: password,
	}

	// Сортируем ключи и фильтруем пустые значения
	const sortedKeys = Object.keys(paramsWithPassword)
		.sort()
		.filter(key => {
			const value = paramsWithPassword[key]
			return value !== undefined && value !== null && value !== ''
		})

	console.log('🔑 Отсортированные ключи для подписи:')
	console.log(sortedKeys)
	console.log()

	// Конкатенируем значения
	const concatenated = sortedKeys
		.map(key => {
			const value = paramsWithPassword[key]
			if (typeof value === 'object' && value !== null) {
				return JSON.stringify(value)
			}
			return String(value)
		})
		.join('')

	console.log('🔗 Конкатенированная строка:')
	console.log(concatenated)
	console.log()
	console.log('Длина:', concatenated.length)
	console.log()

	// Вычисляем SHA-256
	const token = crypto.createHash('sha256').update(concatenated).digest('hex')
	return token
}

const token = generateToken(requestBody, E2C_PASSWORD)

console.log('🔐 Сгенерированный Token:')
console.log(token)
console.log()

console.log('📥 Token из логов (для сравнения):')
console.log('6c84a0fd02acf2aa97135c8611543aa189c586baabf34bd8397ce9bc7397d362')
console.log()

if (
	token === '6c84a0fd02acf2aa97135c8611543aa189c586baabf34bd8397ce9bc7397d362'
) {
	console.log('✅ Подписи совпадают! Пароль правильный.')
} else {
	console.log('❌ Подписи НЕ совпадают!')
	console.log()
	console.log('Возможные причины:')
	console.log('1. Неправильный пароль E2C терминала')
	console.log('2. Неправильный порядок параметров')
	console.log('3. Неправильное преобразование типов (boolean -> string)')
}
