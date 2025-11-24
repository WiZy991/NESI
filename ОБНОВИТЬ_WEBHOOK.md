# 🔄 Обновление webhook на сервере

## ⚠️ Проблема

Вы все еще получаете `INVALID_SIGNATURE` потому что изменения в коде еще не применены на сервере.

## ✅ Решение: Обновить код на сервере

### Шаг 1: Загрузить изменения

```bash
# На сервере
cd ~/nesi-app
git pull origin main
# Или если используете другую ветку:
# git pull origin master
```

### Шаг 2: Пересобрать проект

```bash
cd NESI
npm install  # Если были новые зависимости
npm run build
```

### Шаг 3: Перезапустить приложение

```bash
pm2 restart nesi
# Или если используете другое имя:
# pm2 restart all
```

### Шаг 4: Проверить снова

```bash
curl -X POST https://nesi.su/api/tbank/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}'
```

**Теперь должно вернуть:** `OK` ✅

---

## 🔍 Если все еще `INVALID_SIGNATURE`

### Проверьте что изменения применились

```bash
# Проверить код на сервере
grep -A 5 "test.*ping" ~/nesi-app/NESI/src/app/api/tbank/webhook/route.ts
```

Должны увидеть проверку на тестовый запрос.

### Проверьте логи

```bash
pm2 logs nesi --lines 20
```

Должны увидеть:

```
Тестовый webhook запрос получен
```

### Перезапустите еще раз

```bash
pm2 restart nesi --update-env
pm2 logs nesi --lines 10
```

---

## 📋 Все команды одной строкой

```bash
cd ~/nesi-app && \
git pull && \
cd NESI && \
npm run build && \
pm2 restart nesi && \
sleep 2 && \
curl -X POST https://nesi.su/api/tbank/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}'
```

---

## ✅ Ожидаемый результат

После обновления:

```bash
$ curl -X POST https://nesi.su/api/tbank/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}'
OK
```

---

## 🎯 Альтернатива: Вручную обновить файл

Если git pull не работает, обновите файл вручную:

```bash
nano ~/nesi-app/NESI/src/app/api/tbank/webhook/route.ts
```

Найдите строку:

```typescript
const isValid = verifyTBankToken(body, body.Token, password)
```

И добавьте ПЕРЕД ней:

```typescript
// Если это тестовый запрос без Token - возвращаем OK
if (!body.Token && (body.test === 'ping' || body.test === 'test')) {
	logger.info('Тестовый webhook запрос получен', { body })
	return new Response('OK', { status: 200 })
}
```

Затем:

```bash
cd ~/nesi-app/NESI
npm run build
pm2 restart nesi
```

---

**После обновления webhook будет возвращать `OK` для тестовых запросов!** ✅
