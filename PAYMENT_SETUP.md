# Настройка платежной системы ЮKassa

## Обзор изменений

Система была полностью переработана для корректной работы с деньгами:

### ✅ Что было сделано:

1. **Поддержка копеек**

   - Все денежные поля переведены с `Int` на `Decimal(10,2)`
   - Поддержка сумм с точностью до копеек (например: 123.45 ₽)

2. **Проверка баланса перед операциями**

   - Нельзя назначить исполнителя, если недостаточно средств
   - Учитывается замороженный баланс (деньги в работе)
   - Подробные сообщения об ошибках с указанием доступной суммы

3. **Утилиты для работы с деньгами** (`src/lib/money.ts`)

   - `parseUserInput()` - безопасный парсинг ввода пользователя
   - `formatMoney()` - форматирование с валютой
   - `hasEnoughBalance()` - проверка достаточности средств
   - `calculatePercentage()` - вычисление процентов (комиссия)

4. **Интеграция с ЮKassa**
   - Создание платежей через API
   - Обработка вебхуков
   - Автоматическое зачисление средств

## Настройка ЮKassa

### 1. Регистрация в ЮKassa

1. Зарегистрируйтесь на https://yookassa.ru/
2. Создайте магазин
3. Получите Shop ID и Secret Key в разделе "Настройки" → "Токены для API"

### 2. Переменные окружения

Добавьте в `.env`:

```env
# ЮKassa
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key

# URL вашего сайта (для возврата после оплаты)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 3. Настройка вебхуков в ЮKassa

1. Откройте личный кабинет ЮKassa
2. Перейдите в "Настройки" → "Уведомления"
3. Добавьте URL вебхука: `https://yourdomain.com/api/wallet/yookassa-webhook`
4. Выберите событие: `payment.succeeded`

### 4. Применение миграций БД

Примените миграцию для изменения типов данных:

```bash
cd NESI
npx prisma migrate deploy
```

Или для dev окружения:

```bash
npx prisma migrate dev
```

## API Endpoints

### 1. Создание платежа

**POST** `/api/wallet/create-payment`

```json
{
	"amount": 1000.5
}
```

Ответ:

```json
{
	"success": true,
	"paymentId": "payment_id",
	"confirmationUrl": "https://yoomoney.ru/checkout/...",
	"amount": 1000.5
}
```

### 2. Проверка статуса платежа

**GET** `/api/wallet/check-payment?paymentId=payment_id`

Ответ:

```json
{
	"status": "succeeded",
	"paid": true,
	"amount": 1000.5,
	"processed": true
}
```

### 3. Баланс пользователя

**GET** `/api/wallet/balance`

Ответ:

```json
{
	"balance": 1500.75,
	"frozenBalance": 500.0,
	"availableBalance": 1000.75
}
```

### 4. Вебхук (для ЮKassa)

**POST** `/api/wallet/yookassa-webhook`

Автоматически обрабатывает уведомления от ЮKassa

## Пример фронтенда

```typescript
// Создание платежа
async function depositBalance(amount: number) {
	const response = await fetch('/api/wallet/create-payment', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ amount }),
	})

	const data = await response.json()

	if (data.confirmationUrl) {
		// Редирект на страницу оплаты ЮKassa
		window.location.href = data.confirmationUrl
	}
}

// Проверка статуса платежа (после возврата с ЮKassa)
async function checkPayment(paymentId: string) {
	const response = await fetch(
		`/api/wallet/check-payment?paymentId=${paymentId}`
	)
	const data = await response.json()

	if (data.paid && data.processed) {
		alert('Оплата прошла успешно!')
		// Обновить баланс на странице
	}
}
```

## Безопасность

### ✅ Реализованные меры безопасности:

1. **Проверка баланса перед операциями**

   - Невозможно уйти в минус
   - Учитывается замороженный баланс

2. **Идемпотентность платежей**

   - Каждый платеж с уникальным ключом
   - Защита от дублирования зачислений

3. **Валидация сумм**

   - Минимальная сумма: 1.00 ₽
   - Максимальная сумма: 100,000.00 ₽
   - Парсинг с защитой от некорректного ввода

4. **Проверка владельца**
   - Платежи привязаны к userId
   - Проверка прав доступа при всех операциях

## Тестирование

### Тестовые данные ЮKassa

Для тестирования используйте тестовые карты:

- **Успешный платеж**: `5555 5555 5555 4477`
- **Отклоненный платеж**: `5555 5555 5555 4444`
- Срок действия: любая будущая дата
- CVC: любые 3 цифры

### Проверка работы

1. Создайте платеж через API
2. Откройте `confirmationUrl` в браузере
3. Оплатите тестовой картой
4. Вернитесь на сайт
5. Проверьте, что баланс увеличился

## Мониторинг

Логи обработки платежей:

```bash
# В консоли сервера
✅ Баланс пользователя user_id пополнен на 1000.50 ₽
```

Проверка транзакций в БД:

```sql
SELECT * FROM "Transaction"
WHERE type = 'yookassa_deposit'
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Частые проблемы

### Платеж не зачислился

1. Проверьте логи сервера
2. Убедитесь, что вебхук настроен правильно
3. Проверьте статус через `/api/wallet/check-payment`

### Ошибка "credentials not configured"

Проверьте `.env`:

```env
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_xxx
```

### Двойное зачисление

Защита реализована через проверку:

```typescript
const existingTransaction = await prisma.transaction.findFirst({
	where: {
		type: 'yookassa_deposit',
		reason: { contains: payment.id },
	},
})
```

## Следующие шаги

1. ✅ Настроить ЮKassa аккаунт
2. ✅ Добавить переменные окружения
3. ✅ Применить миграции
4. ✅ Настроить вебхуки
5. 🔲 Создать UI для пополнения баланса
6. 🔲 Добавить страницу истории транзакций
7. 🔲 Настроить email-уведомления о платежах

## Поддержка

Документация ЮKassa: https://yookassa.ru/developers/
Поддержка ЮKassa: support@yookassa.ru
