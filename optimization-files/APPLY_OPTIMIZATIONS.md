# 🚀 Применение оптимизаций

## 📋 Быстрое применение критических оптимизаций

### Шаг 1: Добавить составные индексы в БД (5 минут)

```bash
# На сервере
cd /home/nesi/nesi-app

# Скопируйте файл add_indexes.sql на сервер и выполните:
psql -U nesi_user -d nesi_db -h localhost < optimization-files/add_indexes.sql

# Проверьте что индексы созданы
psql -U nesi_user -d nesi_db -h localhost -c "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename;"
```

**Ожидаемый результат:** ~10 новых индексов создано

---

### Шаг 2: Добавить кеширование категорий (10 минут)

```bash
# На сервере
cd /home/nesi/nesi-app

# Создайте файл categoryCache.ts
nano src/lib/categoryCache.ts
# Вставьте содержимое из optimization-files/categoryCache.ts
```

**Использование в API:**

```typescript
// src/app/api/categories/route.ts
import { getCachedCategories } from '@/lib/categoryCache'

export async function GET() {
	const categories = await getCachedCategories()
	return NextResponse.json({ categories })
}
```

**Инвалидация кеша при изменении:**

```typescript
// src/app/api/admin/categories/route.ts
import { invalidateCategoryCache } from '@/lib/categoryCache'

export async function POST(req: Request) {
	// ... создание категории ...

	// Инвалидировать кеш
	invalidateCategoryCache()

	return NextResponse.json({ success: true })
}
```

---

### Шаг 3: Оптимизировать API /api/chats (10 минут)

```bash
# На сервере
cd /home/nesi/nesi-app

# Создайте бэкап текущего файла
cp src/app/api/chats/route.ts src/app/api/chats/route.ts.backup

# Замените на оптимизированную версию
nano src/app/api/chats/route.ts
# Вставьте содержимое из optimization-files/optimized-chats-route.ts
```

**Тестирование:**

```bash
# Проверьте что API работает
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/chats

# Сравните время ответа ДО и ПОСЛЕ
time curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/chats
```

---

### Шаг 4: Пересобрать и перезапустить (5 минут)

```bash
cd /home/nesi/nesi-app

# Пересобрать проект
npm run build

# Перезапустить приложение
pm2 restart nesi-app

# Проверить логи
pm2 logs nesi-app --lines 50
```

---

## 🎯 Проверка результатов

### 1. Проверить индексы

```bash
psql -U nesi_user -d nesi_db -h localhost << EOF
-- Размер индексов
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid::regclass) DESC;
EOF
```

### 2. Проверить кеш категорий

```bash
# В логах приложения должно появиться:
# "✅ Categories from cache" - при повторных запросах
# "🔄 Fetching categories from DB" - при первом запросе

pm2 logs nesi-app | grep -i "categories"
```

### 3. Проверить производительность API

```bash
cd /home/nesi/nesi-app/load-tests

# Запустить тесты ДО и ПОСЛЕ оптимизации
npm run test:api

# Сравнить результаты
```

---

## 📊 Ожидаемые улучшения после базовых оптимизаций

| Метрика                  | До   | После | Улучшение   |
| ------------------------ | ---- | ----- | ----------- |
| GET /api/chats           | 2-5s | 0.3s  | **-85%** 🔥 |
| GET /api/tasks           | 0.8s | 0.3s  | **-62%**    |
| GET /api/categories      | 0.2s | 0.05s | **-75%**    |
| Количество запросов к БД | 100% | 40%   | **-60%**    |

---

## 🚀 Дополнительная оптимизация (опционально)

### Установить Redis (30 минут)

```bash
# На сервере
cd /home/nesi/nesi-app

# Запустить скрипт установки
chmod +x optimization-files/redis-setup.sh
bash optimization-files/redis-setup.sh

# Скопировать redis.ts в проект
cp optimization-files/redis.ts src/lib/redis.ts
```

**Использование Redis в API:**

```typescript
// src/app/api/tasks/route.ts
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const page = parseInt(searchParams.get('page') || '1')
	const filters = searchParams.toString()

	// Попытка получить из кеша
	const cacheKey = CACHE_KEYS.tasksList(page, filters)
	const cached = await cacheGet<any>(cacheKey)

	if (cached) {
		console.log('✅ Tasks from Redis cache')
		return NextResponse.json(cached)
	}

	// Запрос к БД
	const tasks = await prisma.task.findMany({
		// ... query
	})

	// Сохранить в кеш на 5 минут
	await cacheSet(cacheKey, { tasks }, CACHE_TTL.SHORT)

	return NextResponse.json({ tasks })
}
```

---

## 📈 Мониторинг оптимизаций

### Просмотр использования индексов

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Проверка медленных запросов

```sql
-- Включить логирование медленных запросов (>100ms)
ALTER DATABASE nesi_db SET log_min_duration_statement = 100;

-- Посмотреть в логах PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Статистика Redis (если установлен)

```bash
# Подключиться к Redis CLI
redis-cli

# Посмотреть статистику
INFO stats

# Посмотреть количество ключей
DBSIZE

# Посмотреть использование памяти
INFO memory

# Мониторинг в реальном времени
MONITOR
```

---

## ✅ Чеклист применения

- [ ] Добавлены составные индексы в БД
- [ ] Создан файл categoryCache.ts
- [ ] Оптимизирован API /api/chats
- [ ] Пересобран проект
- [ ] Перезапущено приложение
- [ ] Проверены логи на ошибки
- [ ] Запущены нагрузочные тесты
- [ ] Сравнены метрики до/после

---

## 🆘 Откат изменений

Если что-то пошло не так:

```bash
# Откатить изменения в chats API
cd /home/nesi/nesi-app
cp src/app/api/chats/route.ts.backup src/app/api/chats/route.ts

# Удалить индексы
psql -U nesi_user -d nesi_db -h localhost << EOF
DROP INDEX IF EXISTS idx_tasks_status_created;
DROP INDEX IF EXISTS idx_messages_task_created;
-- ... и т.д.
EOF

# Пересобрать и перезапустить
npm run build
pm2 restart nesi-app
```

---

**Удачи с оптимизацией! 🚀**
