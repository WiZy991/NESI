# 💰 Система работы с деньгами и платежами

## 📋 Обзор

Полностью переработанная система работы с деньгами, которая включает:

- ✅ **Поддержка копеек** (Decimal с точностью до 2 знаков)
- ✅ **Проверка баланса** перед всеми операциями
- ✅ **Замороженный баланс** (деньги в работе)
- ✅ **Интеграция с ЮKassa** для пополнения
- ✅ **Безопасные транзакции** с защитой от дублирования

---

## 🚀 Быстрый старт

### 1. Применить миграцию БД

```bash
cd NESI
npx prisma migrate deploy
```

### 2. Настроить переменные окружения

Добавьте в `.env`:

```env
# ЮKassa
YOOKASSA_SHOP_ID="your_shop_id"
YOOKASSA_SECRET_KEY="your_secret_key"

# URL сайта
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 3. Настроить вебхук в ЮKassa

URL: `https://yourdomain.com/api/wallet/yookassa-webhook`  
Событие: `payment.succeeded`

### 4. Использовать компонент пополнения

```tsx
import DepositBalanceModal from '@/components/DepositBalanceModal'

function MyComponent() {
	const [showModal, setShowModal] = useState(false)

	return (
		<>
			<button onClick={() => setShowModal(true)}>Пополнить баланс</button>

			<DepositBalanceModal
				isOpen={showModal}
				onClose={() => setShowModal(false)}
			/>
		</>
	)
}
```

---

## 📁 Созданные файлы

### Backend (API)

| Файл                                           | Описание                      |
| ---------------------------------------------- | ----------------------------- |
| `src/lib/money.ts`                             | Утилиты для работы с деньгами |
| `src/lib/yookassa.ts`                          | Интеграция с ЮKassa API       |
| `src/app/api/wallet/balance/route.ts`          | Получение баланса             |
| `src/app/api/wallet/deposit/route.ts`          | Пополнение (тест)             |
| `src/app/api/wallet/withdraw/route.ts`         | Вывод средств                 |
| `src/app/api/wallet/create-payment/route.ts`   | Создание платежа через ЮKassa |
| `src/app/api/wallet/check-payment/route.ts`    | Проверка статуса платежа      |
| `src/app/api/wallet/yookassa-webhook/route.ts` | Обработка вебхуков ЮKassa     |

### Обновленные endpoints

| Файл                                              | Что изменено                          |
| ------------------------------------------------- | ------------------------------------- |
| `src/app/api/tasks/[id]/assign/route.ts`          | ✅ Проверка баланса перед назначением |
| `src/app/api/tasks/[id]/complete/route.ts`        | ✅ Работа с Decimal, комиссия 20%     |
| `src/app/api/tasks/[id]/cancel/route.ts`          | ✅ Возврат замороженных средств       |
| `src/app/api/tasks/[id]/accept-executor/route.ts` | ✅ Проверка баланса + заморозка       |

### Frontend

| Файл                                     | Описание                   |
| ---------------------------------------- | -------------------------- |
| `src/components/DepositBalanceModal.tsx` | Модальное окно пополнения  |
| `src/app/wallet/payment-result/page.tsx` | Страница результата оплаты |

### База данных

| Файл                                                        | Описание                    |
| ----------------------------------------------------------- | --------------------------- |
| `prisma/schema.prisma`                                      | Обновленная схема с Decimal |
| `prisma/migrations/_convert_money_to_decimal/migration.sql` | Миграция Int → Decimal      |

### Документация

| Файл                           | Описание                       |
| ------------------------------ | ------------------------------ |
| `PAYMENT_SETUP.md`             | Полная инструкция по настройке |
| `ENV_SETUP.md`                 | Настройка переменных окружения |
| `MONEY_AND_PAYMENTS_README.md` | Этот файл                      |

---

## 🔒 Безопасность

### Реализованные проверки

1. **Проверка баланса перед операциями**

   ```typescript
   if (!hasEnoughBalance(balance, frozenBalance, price)) {
   	return error('Недостаточно средств')
   }
   ```

2. **Защита от отрицательного баланса**

   ```typescript
   const availableBalance = balance - frozenBalance
   // Невозможно взять задачу, если availableBalance < price
   ```

3. **Идемпотентность платежей**

   ```typescript
   const existingTransaction = await prisma.transaction.findFirst({
   	where: { reason: { contains: payment.id } },
   })
   ```

4. **Валидация сумм**
   ```typescript
   const parsed = parseUserInput(amount)
   // Защита от: "abc", "-100", "999999999"
   ```

---

## 💡 Примеры использования

### Получить баланс

```typescript
const response = await fetch('/api/wallet/balance')
const data = await response.json()

console.log(data)
// {
//   balance: 1500.75,
//   frozenBalance: 500.00,
//   availableBalance: 1000.75
// }
```

### Создать платеж

```typescript
const response = await fetch('/api/wallet/create-payment', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ amount: 1000.5 }),
})

const { confirmationUrl } = await response.json()
window.location.href = confirmationUrl // Редирект на ЮKassa
```

### Форматировать деньги

```typescript
import { formatMoney, toNumber } from '@/lib/money'

const balance = new Decimal(1234.56)
console.log(formatMoney(balance)) // "1234.56 ₽"
console.log(toNumber(balance)) // 1234.56
```

### Проверить достаточность средств

```typescript
import { hasEnoughBalance } from '@/lib/money'

const canAfford = hasEnoughBalance(
	user.balance, // 1000.00
	user.frozenBalance, // 300.00
	price // 500.00
)

console.log(canAfford) // true (1000 - 300 >= 500)
```

---

## 🧪 Тестирование

### Тестовые карты ЮKassa

| Карта                 | Результат          |
| --------------------- | ------------------ |
| `5555 5555 5555 4477` | ✅ Успешная оплата |
| `5555 5555 5555 4444` | ❌ Отклонена       |

CVC: любые 3 цифры  
Срок: любая будущая дата

### Сценарий тестирования

1. Открыть профиль → Пополнить баланс
2. Ввести сумму 100.50 ₽
3. Нажать "Перейти к оплате"
4. Оплатить тестовой картой
5. Вернуться на сайт
6. Проверить баланс (должен увеличиться на 100.50)

---

## 📊 Мониторинг

### Логи сервера

```bash
# Успешное пополнение
✅ Баланс пользователя user_xxx пополнен на 1000.50 ₽

# Недостаточно средств
❌ Insufficient balance: required 500.00, available 300.00
```

### SQL запросы

```sql
-- История транзакций
SELECT * FROM "Transaction"
WHERE "userId" = 'user_id'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Пополнения через ЮKassa
SELECT * FROM "Transaction"
WHERE type = 'yookassa_deposit'
ORDER BY "createdAt" DESC;

-- Баланс пользователей
SELECT id, email, balance, "frozenBalance"
FROM "User"
ORDER BY balance DESC
LIMIT 10;
```

---

## ⚠️ Частые ошибки и решения

### "credentials not configured"

**Причина**: Не настроены переменные окружения  
**Решение**: Проверьте `.env`:

```env
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_xxx
```

### Платеж не зачислился

**Причина**: Вебхук не настроен или не работает  
**Решение**:

1. Проверьте URL вебхука в ЮKassa
2. Проверьте логи сервера
3. Вручную проверьте через `/api/wallet/check-payment`

### "Недостаточно средств"

**Причина**: Учитывается замороженный баланс  
**Решение**: Проверьте:

```typescript
availableBalance = balance - frozenBalance
```

### Миграция не применяется

**Причина**: Проблема с shadow database  
**Решение**: Миграция уже создана вручную:

```bash
npx prisma migrate deploy
```

---

## 📈 Следующие шаги

- [ ] Создать страницу истории транзакций
- [ ] Добавить email-уведомления о платежах
- [ ] Реализовать автоматический вывод средств
- [ ] Добавить систему рефералов
- [ ] Интегрировать Stripe как альтернативу

---

## 📚 Документация

- **ЮKassa API**: https://yookassa.ru/developers/api
- **Prisma Decimal**: https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-decimal
- **Next.js API Routes**: https://nextjs.org/docs/api-routes/introduction

---

## 💬 Поддержка

Если возникли вопросы:

1. Проверьте `PAYMENT_SETUP.md` - подробная инструкция
2. Проверьте логи сервера
3. Проверьте базу данных (таблица Transaction)

---

## ✨ Что было улучшено

### До

```typescript
// ❌ Целые числа (без копеек)
balance: Int @default(100)

// ❌ Нет проверки баланса
await prisma.user.update({
  data: { balance: { decrement: price } }
})

// ❌ Можно уйти в минус
```

### После

```typescript
// ✅ Decimal с копейками
balance: Decimal @default(100.00) @db.Decimal(10, 2)

// ✅ Проверка баланса
if (!hasEnoughBalance(balance, frozenBalance, price)) {
  return error('Недостаточно средств')
}

// ✅ Невозможно уйти в минус
const available = balance - frozenBalance
```

---

## 🎉 Готово!

Теперь система работы с деньгами настроена полностью:

- ✅ Поддержка копеек
- ✅ Проверка баланса
- ✅ ЮKassa интеграция
- ✅ Безопасные транзакции

**Можно пополнять баланс и работать с задачами!** 🚀
