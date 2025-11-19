# 📡 Примеры использования API Т-Банк

## ⚠️ Важно: Замените URL на ваш реальный домен

Во всех примерах замените `YOUR_DOMAIN` на ваш реальный домен (например, `nesi.ru`, `your-server.com`).

## 🔍 Проверка платежа

```bash
curl -X POST https://YOUR_DOMAIN/api/wallet/tbank/check-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"paymentId": "YOUR_PAYMENT_ID"}'
```

## 🔄 Обновление DealId в существующих транзакциях

```bash
curl -X POST https://YOUR_DOMAIN/api/wallet/tbank/update-deal-ids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 💰 Создание платежа (пополнение)

```bash
curl -X POST https://YOUR_DOMAIN/api/wallet/tbank/create-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 1000}'
```

## 💸 Создание выплаты (вывод)

```bash
curl -X POST https://YOUR_DOMAIN/api/wallet/tbank/create-withdrawal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 500,
    "phone": "79001234567",
    "sbpMemberId": "100000000004"
  }'
```

## 🔐 Получение токена авторизации

Токен обычно получается при авторизации через `/api/auth/login`:

```bash
curl -X POST https://YOUR_DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

Ответ содержит токен, который нужно использовать в заголовке `Authorization: Bearer TOKEN`.

---

**Примечание:** Для локальной разработки используйте `http://localhost:3000`, для продакшена - ваш реальный домен.
