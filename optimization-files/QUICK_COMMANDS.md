# ⚡ Быстрые команды для оптимизации

## 🚀 Применение оптимизаций (5-10 минут)

### На локальном компьютере (Windows PowerShell):

```powershell
# 1. Перейти в папку проекта
cd C:\Users\Perfercher\Desktop\nesi\NESI

# 2. Загрузить файлы на сервер (замените на свои данные)
scp -r optimization-files nesi@ваш-сервер.beget.tech:/home/nesi/nesi-app/
```

### На сервере (через SSH):

```bash
# 1. Подключиться к серверу
ssh nesi@ваш-сервер.beget.tech

# 2. Перейти в папку проекта
cd /home/nesi/nesi-app

# 3. Запустить автоматический скрипт
chmod +x optimization-files/apply-optimizations.sh
bash optimization-files/apply-optimizations.sh
```

**Готово!** Скрипт сделает всё автоматически. ✅

---

## 📝 Ручное применение (если нужно)

```bash
cd /home/nesi/nesi-app

# Шаг 1: Индексы в БД (2 мин)
psql -U nesi_user -d nesi_db -h localhost < optimization-files/add_indexes.sql

# Шаг 2: Кеш категорий (1 мин)
cp optimization-files/categoryCache.ts src/lib/categoryCache.ts

# Шаг 3: Оптимизация API (1 мин)
cp src/app/api/chats/route.ts src/app/api/chats/route.ts.backup
cp optimization-files/optimized-chats-route.ts src/app/api/chats/route.ts

# Шаг 4: Пересборка (3-5 мин)
npm run build

# Шаг 5: Перезапуск (1 мин)
pm2 restart nesi-app
pm2 logs nesi-app --lines 50
```

---

## 🔍 Проверка результатов

```bash
# Проверить индексы
psql -U nesi_user -d nesi_db -h localhost -c "
SELECT COUNT(*) FROM pg_indexes
WHERE indexname LIKE 'idx_%';
"

# Проверить логи
pm2 logs nesi-app | grep -i "cache"

# Тест производительности
cd load-tests
npm run test:api
```

---

## 🆘 Откат изменений

```bash
cd /home/nesi/nesi-app

# Откатить API
cp src/app/api/chats/route.ts.backup src/app/api/chats/route.ts

# Пересобрать
npm run build
pm2 restart nesi-app
```

---

## 📊 Полезные команды

```bash
# Статус приложения
pm2 status

# Логи в реальном времени
pm2 logs nesi-app

# Использование ресурсов
pm2 monit

# Перезапуск
pm2 restart nesi-app

# Список индексов БД
psql -U nesi_user -d nesi_db -h localhost -c "\di+"

# Размер таблиц БД
psql -U nesi_user -d nesi_db -h localhost -c "
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Статистика использования индексов
psql -U nesi_user -d nesi_db -h localhost -c "
SELECT
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as reads,
    idx_tup_fetch as fetches
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
"
```

---

## 🎯 Следующие шаги (опционально)

### Установить Redis (30 мин)

```bash
cd /home/nesi/nesi-app

# Запустить скрипт установки
chmod +x optimization-files/redis-setup.sh
bash optimization-files/redis-setup.sh

# Скопировать файл Redis
cp optimization-files/redis.ts src/lib/redis.ts

# Установить зависимости
npm install ioredis
npm install -D @types/ioredis

# Пересобрать и перезапустить
npm run build
pm2 restart nesi-app
```

### Использование Redis в API

```typescript
// Пример использования в любом API роуте
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'

export async function GET() {
	// Попытка получить из кеша
	const cached = await cacheGet(CACHE_KEYS.categories)
	if (cached) return NextResponse.json(cached)

	// Запрос к БД
	const data = await prisma.category.findMany()

	// Сохранить в кеш
	await cacheSet(CACHE_KEYS.categories, data, CACHE_TTL.LONG)

	return NextResponse.json(data)
}
```

---

## 📈 Ожидаемые результаты

✅ **GET /api/chats:** 2-5s → 0.3s (-85%)  
✅ **GET /api/tasks:** 0.8s → 0.3s (-62%)  
✅ **GET /api/categories:** 0.2s → 0.05s (-75%)  
✅ **Запросы к БД:** -60%  
✅ **CPU usage:** -40%

---

**Подробные инструкции:**

- `КАК_ПРИМЕНИТЬ.md` - Полная инструкция
- `APPLY_OPTIMIZATIONS.md` - Детальный гайд
- `README.md` - Обзор всех файлов
