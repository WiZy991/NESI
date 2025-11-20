# 🔧 Исправление PaymentRecipientId для СБП

**Дата:** 20 ноября 2025  
**Проблема:** Ошибка 322 "Неверные параметры" при выводе через СБП

---

## ❌ Проблема

При выплате через СБП передавался лишний параметр `PaymentRecipientId`:

```json
{
  "PaymentRecipientId": "+79662765973",  ← ❌ Не нужен для СБП!
  "Phone": "79662765973",
  "SbpMemberId": "100000000004"
}
```

**Ошибка:** `PaymentRecipientId` - это идентификатор **продавца** (получателя платежа), который:

- Используется для выплат на карту
- НЕ используется для выплат через СБП
- Конфликтует с параметрами `Phone` + `SbpMemberId`

---

## ✅ Решение

Изменена логика добавления параметров в зависимости от способа выплаты.

### Было (неправильно):

```typescript
const requestBody = {
	TerminalKey: terminalKey,
	Amount: amountInKopecks,
	OrderId: params.orderId,
	PaymentRecipientId: params.paymentRecipientId, // ❌ Всегда добавлялся
	DealId: params.dealId,
}

// Если СБП - добавляем Phone + SbpMemberId ВДОБАВОК к PaymentRecipientId
if (params.phone && params.sbpMemberId) {
	requestBody.Phone = params.phone
	requestBody.SbpMemberId = params.sbpMemberId
}
```

### Стало (правильно):

```typescript
const requestBody = {
	TerminalKey: terminalKey,
	Amount: amountInKopecks,
	OrderId: params.orderId,
	DealId: params.dealId,
}

// Если СБП - используем ТОЛЬКО Phone + SbpMemberId
if (params.phone && params.sbpMemberId) {
	requestBody.Phone = params.phone
	requestBody.SbpMemberId = params.sbpMemberId
}
// Если карта - используем CardId + PaymentRecipientId
else if (params.cardId) {
	requestBody.CardId = params.cardId
	requestBody.PaymentRecipientId = params.paymentRecipientId
}
// Иначе - PaymentRecipientId как fallback
else {
	requestBody.PaymentRecipientId = params.paymentRecipientId
}
```

---

## 📋 Что изменено

### Файл: `src/lib/tbank.ts`

**Строка 311-333:**

Теперь параметры добавляются **взаимоисключающим образом**:

1. **Для СБП (Phone + SbpMemberId):**

   ```json
   {
   	"Phone": "79662765973",
   	"SbpMemberId": "100000000004"
   }
   ```

   ✅ БЕЗ `PaymentRecipientId`!

2. **Для карты (CardId + PaymentRecipientId):**

   ```json
   {
   	"CardId": "123456",
   	"PaymentRecipientId": "+79662765973"
   }
   ```

3. **Для других способов:**
   ```json
   {
   	"PaymentRecipientId": "+79662765973"
   }
   ```

---

## 🚀 Применение исправления

### На сервере:

```bash
cd ~/nesi-app

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

После применения исправления в запросе к Т-Банк будет:

**Было:**

```json
{
  "TerminalKey": "1763372956356E2C",
  "Amount": 10000,
  "OrderId": "withdraw_...",
  "PaymentRecipientId": "+79662765973",  ← ❌ Лишний параметр
  "DealId": "56868517",
  "Phone": "79662765973",
  "SbpMemberId": "100000000004",
  "FinalPayout": true
}
```

**Стало:**

```json
{
  "TerminalKey": "1763372956356E2C",
  "Amount": 10000,
  "OrderId": "withdraw_...",
  "DealId": "56868517",
  "Phone": "79662765973",                ← ✅ Только СБП параметры
  "SbpMemberId": "100000000004",         ← ✅
  "FinalPayout": true
}
```

---

## 🔍 Проверка

После применения исправления попробуйте вывести средства и проверьте логи:

```bash
sudo journalctl -u nesi-app.service --since "1 minute ago" --no-pager | grep -E "CREATE-WITHDRAWAL|TBANK|Success"
```

**Должно быть:**

```
💸 [CREATE-WITHDRAWAL] Параметры выплаты: {
  phone: '79662765973',
  sbpMemberId: '100000000004'
}
📤 [TBANK] Подготовка запроса на выплату: {
  "Phone": "79662765973",
  "SbpMemberId": "100000000004"
  // БЕЗ PaymentRecipientId!
}
✅ [TBANK] Выплата успешно создана
PaymentId: XXXXXXXX
```

---

## 📝 Согласно документации A2C_V2

Т-Банк API требует:

### Для выплаты через СБП:

- ✅ `Phone` - номер телефона (11 цифр)
- ✅ `SbpMemberId` - ID банка
- ❌ `PaymentRecipientId` - НЕ НУЖЕН

### Для выплаты на карту:

- ✅ `CardId` - ID привязанной карты
- ✅ `PaymentRecipientId` - ID получателя
- ❌ `Phone` - НЕ НУЖЕН

---

**Готово!** После применения исправления выплаты через СБП должны заработать! 🚀
