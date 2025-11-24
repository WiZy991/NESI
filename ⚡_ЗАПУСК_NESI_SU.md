# ⚡ Запуск на сервере nesi.su

## 🎯 Ваши URL для настройки

### Основной сайт

```
https://nesi.su
```

### Webhook для Т-Банка

```
https://nesi.su/api/tbank/webhook
```

### После оплаты

```
Success: https://nesi.su/profile?payment=success
Fail: https://nesi.su/profile?payment=failed
```

---

## ⚙️ Настройка на сервере

### 1. Создать .env

```bash
ssh user@nesi.su
cd /path/to/nesi/NESI
nano .env
```

Вставьте (скопируйте из `ENV_NESI_SU_EXAMPLE.txt`):

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_BASE_URL="https://nesi.su"
TBANK_TERMINAL_KEY="TinkoffBankTest"
TBANK_TERMINAL_PASSWORD="ваш_пароль"
TBANK_E2C_TERMINAL_KEY="TerminalKeyE2C"
TBANK_E2C_TERMINAL_PASSWORD="ваш_e2c_пароль"
TBANK_MODE="test"
```

### 2. Применить изменения

```bash
# Миграция БД
npx prisma migrate deploy
npx prisma generate

# Пересборка
npm run build

# Перезапуск
pm2 restart nesi
```

### 3. Настроить Т-Банк

Откройте https://business.tbank.ru

**Notification URL:**

```
https://nesi.su/api/tbank/webhook
```

---

## ✅ Проверка

### Проверить статус

```bash
curl https://nesi.su/api/tbank/status
```

Должно вернуть:

```json
{ "configured": true, "mode": "test" }
```

### Проверить webhook

```bash
curl -X POST https://nesi.su/api/tbank/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}'
```

Должно вернуть: `OK`

### Протестировать UI

1. Откройте: **https://nesi.su/profile**
2. Вкладка "Кошелек"
3. Попробуйте пополнить
4. Попробуйте вывести

---

## 🔥 Быстрые команды

```bash
# Проверить статус
pm2 status nesi

# Логи
pm2 logs nesi

# Перезапуск
pm2 restart nesi

# Проверить БД
psql -U user -d nesi -c "SELECT * FROM \"TBankDeal\" LIMIT 3;"
```

---

## 📋 Чеклист

- [ ] .env создан на сервере с `NEXT_PUBLIC_BASE_URL="https://nesi.su"`
- [ ] Миграция применена (`npx prisma migrate deploy`)
- [ ] Проект пересобран (`npm run build`)
- [ ] Сервис перезапущен (`pm2 restart nesi`)
- [ ] Webhook настроен: `https://nesi.su/api/tbank/webhook`
- [ ] Firewall настроен (IP Т-Банка разрешены)
- [ ] Протестировано на сайте

---

## 🎊 Готово!

Ваш сайт **nesi.su** готов к приему платежей через Т-Банк!

**Тестируйте:** https://nesi.su/profile → Кошелек

**Документация:** См. `НАСТРОЙКА_ДЛЯ_NESI_SU.md`
