# 🔧 Исправление PaymentRecipientId для СБП (v2 - финальное)

**Дата:** 20 ноября 2025  
**Проблема:** Ошибка 322 "Неверные параметры" при выводе через СБП

---

## ❌ Первоначальная ошибка (исправлена неправильно)

Я **ошибочно** удалил `PaymentRecipientId` для выплат по СБП, предполагая, что он не нужен.

**Было (НЕПРАВИЛЬНО):**

```typescript
if (params.phone && params.sbpMemberId) {
	requestBody.Phone = params.phone
	requestBody.SbpMemberId = params.sbpMemberId
	// ❌ PaymentRecipientId удален!
}
```

---

## ✅ Правильное решение (согласно документации)

Изучив **официальную документацию A2C_V2 (стр. 15-16)**, нашел правильный пример:

```json
{
	"TerminalKey": "TerminalKeyE2C",
	"OrderId": "testSBP 10",
	"Phone": "79998887766",
	"SbpMemberId": "100000000004",
	"FinalPayout": "true",
	"Amount": 100,
	"DealId": "9043456",
	"PaymentRecipientId": "79066589133",
	"Token": "..."
}
```

**Ключевые наблюдения:**

1. ✅ `PaymentRecipientId` **ОБЯЗАТЕЛЕН** для СБП!
2. ✅ Формат: **11 цифр, начиная с '7', БЕЗ плюса**
3. ✅ `Phone` — такой же формат (11 цифр без плюса)

---

## 📋 Что исправлено

### Файл: `src/lib/tbank.ts`

**Строка 325-345:**

**Было:**

```typescript
// Если выплата по СБП - используем Phone + SbpMemberId
// PaymentRecipientId НЕ НУЖЕН для СБП!  ← ❌ НЕПРАВИЛЬНО!
if (params.phone && params.sbpMemberId) {
	requestBody.Phone = params.phone
	requestBody.SbpMemberId = params.sbpMemberId
}
// Если выплата на карту - используем CardId + PaymentRecipientId
else if (params.cardId) {
	requestBody.CardId = params.cardId
	requestBody.PaymentRecipientId = params.paymentRecipientId
}
// Если нет ни СБП, ни карты - добавляем PaymentRecipientId как fallback
else {
	requestBody.PaymentRecipientId = params.paymentRecipientId
}
```

**Стало:**

```typescript
// PaymentRecipientId ВСЕГДА обязателен (согласно документации A2C_V2 стр. 15-16)
requestBody.PaymentRecipientId = params.paymentRecipientId

// Если выплата по СБП - дополнительно добавляем Phone + SbpMemberId
if (params.phone && params.sbpMemberId) {
	requestBody.Phone = params.phone
	requestBody.SbpMemberId = params.sbpMemberId
}
// Если выплата на карту - добавляем CardId
else if (params.cardId) {
	requestBody.CardId = params.cardId
}
```

---

### Файл: `src/app/api/wallet/tbank/create-withdrawal/route.ts`

**Строка 331-346:**

**Было:**

```typescript
// Формируем корректный PaymentRecipientId в формате +7XXXXXXXXXX
let formattedPhone = ''
if (cleanPhone.length >= 10) {
	formattedPhone = `+7${cleanPhone.slice(-10)}` // ❌ С плюсом!
} else {
	formattedPhone = `+7${user.id
		.replace(/\D/g, '')
		.slice(0, 10)
		.padEnd(10, '0')}`
}
```

**Стало:**

```typescript
// Формируем корректный PaymentRecipientId в формате 7XXXXXXXXXX (11 цифр, БЕЗ +)
// Согласно документации A2C_V2 стр. 15-16: "PaymentRecipientId": "79066589133"
let formattedPhone = ''
if (cleanPhone.length >= 11 && cleanPhone.startsWith('7')) {
	// Уже есть 11 цифр с '7' в начале
	formattedPhone = cleanPhone.slice(0, 11)
} else if (cleanPhone.length >= 10) {
	// Берем последние 10 цифр и добавляем '7'
	formattedPhone = `7${cleanPhone.slice(-10)}`
} else {
	// Если номер недостаточно длинный, используем user.id как fallback
	formattedPhone = `7${user.id.replace(/\D/g, '').slice(0, 10).padEnd(10, '0')}`
}
```

---

## 🔍 Итоговая структура запроса

После исправления запрос к Т-Банк E2C будет выглядеть так:

```json
{
	"TerminalKey": "1763372956356E2C",
	"Amount": 10000,
	"OrderId": "withdraw_...",
	"DealId": "56868517",
	"PaymentRecipientId": "79662765973",
	"Phone": "79662765973",
	"SbpMemberId": "100000000004",
	"FinalPayout": true,
	"NotificationURL": "https://nesi.su/api/wallet/tbank/webhook",
	"Token": "<сгенерирован с TBANK_E2C_PASSWORD>"
}
```

**Важно:**

- ✅ `PaymentRecipientId` = 11 цифр, БЕЗ `+`
- ✅ `Phone` = 11 цифр, БЕЗ `+`
- ✅ Оба начинаются с `7`
- ✅ `Token` генерируется с паролем `TBANK_E2C_PASSWORD`

---

## 🚀 Применение исправления

### На сервере:

```bash
cd ~/nesi-app

# Убедитесь, что настроен пароль E2C терминала
grep TBANK_E2C_PASSWORD .env

# Если нет - добавьте:
# TBANK_E2C_PASSWORD=ваш_пароль_от_E2C_терминала

# Загрузите изменения
git pull

# Пересоберите
npm run build

# Перезапустите
sudo systemctl restart nesi-app.service

# Проверьте логи
sudo journalctl -u nesi-app.service -f
```

---

## ✅ Ожидаемый результат

### Логи должны показать:

```
💸 [CREATE-WITHDRAWAL] Параметры выплаты: {
  paymentRecipientId: '79662765973',  ← ✅ 11 цифр, БЕЗ +
  phone: '79662765973',               ← ✅ 11 цифр, БЕЗ +
  sbpMemberId: '100000000004'
}

📤 [TBANK] Подготовка запроса на выплату: {
  "PaymentRecipientId": "79662765973",  ← ✅
  "Phone": "79662765973",               ← ✅
  "SbpMemberId": "100000000004"
}

📥 [TBANK] Ответ от API: {
  success: true,
  errorCode: '0',
  paymentId: 'XXXXXXXX',
  status: 'COMPLITING'
}

✅ [CREATE-WITHDRAWAL] Выплата создана!
```

---

## 📝 Документация

Согласно **официальной документации Т-Банк A2C_V2 (Выплаты), стр. 15-16:**

### Для выплаты по СБП требуются параметры:

| Параметр             | Формат           | Пример         | Обязательность |
| -------------------- | ---------------- | -------------- | -------------- |
| `TerminalKey`        | String (E2C)     | `...E2C`       | Да             |
| `OrderId`            | String           | `withdraw_...` | Да             |
| `Amount`             | Number (копейки) | `10000`        | Да             |
| `DealId`             | String           | `56868517`     | Да             |
| `PaymentRecipientId` | String (11 цифр) | `79662765973`  | Да             |
| `Phone`              | String (11 цифр) | `79662765973`  | Да (для СБП)   |
| `SbpMemberId`        | String           | `100000000004` | Да (для СБП)   |
| `FinalPayout`        | Boolean          | `true`         | Да             |
| `Token`              | String (SHA-256) | `...`          | Да             |

---

## 🎯 Резюме

1. **PaymentRecipientId ОБЯЗАТЕЛЕН** для всех типов выплат (карта, СБП, партнер)
2. **Формат:** 11 цифр, начиная с '7', БЕЗ символа '+'
3. **Phone** для СБП — такой же формат (11 цифр без '+')
4. **Token** должен генерироваться с паролем **E2C терминала**

---

**Готово!** Теперь выплаты через СБП должны работать! 🎉
