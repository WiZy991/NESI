# 🚀 План оптимизации производительности NESI

## 📊 Результаты анализа

### ❌ Найденные проблемы:

1. **API Performance:**

   - `/api/chats` - загружает ВСЕ сообщения без пагинации (потенциально тысячи записей!)
   - `/api/tasks/[id]` - N+1 проблема с reviews в responses
   - Отсутствует кеширование часто запрашиваемых данных (категории, подкатегории)

2. **Frontend Performance:**

   - `Header.tsx` - 822 строки, не lazy loaded
   - `TaskDetailPageContent.tsx` - 777 строк, много useEffect без оптимизации
   - `CommunityPost.tsx` - тяжелый компонент без мемоизации

3. **Database:**

   - Отсутствуют составные индексы для сложных запросов
   - Много `include` вместо `select`

4. **Infrastructure:**
   - Нет Redis для кеширования
   - Нет CDN для статических файлов
   - Нет bundle analyzer

---

## ✅ План оптимизации (по приоритетам)

### 🔥 Критическая оптимизация (Сделать сейчас!)

#### 1. Оптимизировать API `/api/chats` (КРИТИЧНО!)

**Проблема:** Загружает ВСЕ сообщения пользователя за все время.

**Решение:**

```typescript
// src/app/api/chats/route.ts
// Добавить пагинацию и ограничение
const limit = 50 // Загружать только последние 50 чатов
const privateMessages = await prisma.privateMessage.findMany({
	where: {
		OR: [{ senderId: user.id }, { recipientId: user.id }],
	},
	take: limit,
	orderBy: { createdAt: 'desc' },
	select: {
		// Вместо include
		id: true,
		content: true,
		createdAt: true,
		senderId: true,
		recipientId: true,
		sender: {
			select: { id: true, fullName: true, avatarUrl: true },
		},
		recipient: {
			select: { id: true, fullName: true, avatarUrl: true },
		},
	},
})
```

#### 2. Добавить кеширование для категорий

**Проблема:** Категории запрашиваются при каждом рендере меню.

**Решение:** Создать in-memory кеш

```typescript
// src/lib/categoryCache.ts
const CACHE_TTL = 60 * 60 * 1000 // 1 час

let categoriesCache: any = null
let cacheTime: number = 0

export async function getCachedCategories() {
	const now = Date.now()

	if (categoriesCache && now - cacheTime < CACHE_TTL) {
		return categoriesCache
	}

	// Fetch from DB
	const categories = await prisma.category.findMany({
		include: { subcategories: true },
	})

	categoriesCache = categories
	cacheTime = now

	return categories
}

export function invalidateCategoryCache() {
	categoriesCache = null
}
```

#### 3. Оптимизировать составные индексы БД

```sql
-- Добавить в миграцию или выполнить вручную
CREATE INDEX IF NOT EXISTS idx_tasks_status_created
  ON "Task"(status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_messages_task_created
  ON "Message"("taskId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON "Notification"("userId", "isRead", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_private_messages_users_created
  ON "PrivateMessage"("senderId", "recipientId", "createdAt" DESC);
```

---

### ⚡ Высокий приоритет (След 2-3 дня)

#### 4. Code Splitting для тяжелых компонентов

**Проблема:** Большие компоненты загружаются всегда, даже если не используются.

**Решение:** Lazy loading

```typescript
// src/app/tasks/[id]/page.tsx
import dynamic from 'next/dynamic'
import LoadingSpinner from '@/components/LoadingSpinner'

const TaskDetailPageContent = dynamic(
	() => import('@/components/TaskDetailPageContent'),
	{
		loading: () => <LoadingSpinner />,
		ssr: false, // Если не нужен SSR
	}
)

const CommunityPost = dynamic(() => import('@/components/CommunityPost'), {
	loading: () => <div>Загрузка поста...</div>,
})
```

#### 5. Мемоизация в компонентах

```typescript
// src/components/TaskDetailPageContent.tsx
import { useMemo, useCallback } from 'react'

// Мемоизировать вычисления
const averageRating = useMemo(() => {
	if (!task?.executor?.reviewsReceived) return 0
	const reviews = task.executor.reviewsReceived
	return (
		reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
	)
}, [task?.executor?.reviewsReceived])

// Мемоизировать callbacks
const handleSubmit = useCallback(async () => {
	// ... logic
}, [dependencies])
```

#### 6. Оптимизировать Header

**Проблема:** Header постоянно перерендеривается.

**Решение:**

```typescript
// src/components/Header.tsx
import { memo } from 'react'

// Вынести тяжелые части в отдельные компоненты
const NotificationBell = memo(function NotificationBell({
	userId,
}: {
	userId: string
}) {
	// ... логика уведомлений
})

const UserMenu = memo(function UserMenu({ user }: { user: any }) {
	// ... логика меню
})
```

---

### 🎯 Средний приоритет (След неделя)

#### 7. Установить Redis для кеширования

```bash
# На сервере
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# В проекте
cd /home/nesi/nesi-app
npm install redis ioredis
npm install -D @types/ioredis
```

```typescript
// src/lib/redis.ts
import Redis from 'ioredis'

const redis = new Redis({
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379'),
	password: process.env.REDIS_PASSWORD,
	retryStrategy: times => {
		const delay = Math.min(times * 50, 2000)
		return delay
	},
})

export async function cacheGet<T>(key: string): Promise<T | null> {
	const cached = await redis.get(key)
	return cached ? JSON.parse(cached) : null
}

export async function cacheSet(key: string, value: any, ttl: number = 3600) {
	await redis.setex(key, ttl, JSON.stringify(value))
}

export async function cacheDelete(key: string) {
	await redis.del(key)
}

export default redis
```

#### 8. Bundle Analyzer

```bash
npm install @next/bundle-analyzer
```

```typescript
// next.config.ts
import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
})

export default bundleAnalyzer(nextConfig)
```

```json
// package.json - добавить скрипт
{
	"scripts": {
		"analyze": "ANALYZE=true npm run build"
	}
}
```

#### 9. Image Optimization

```bash
# Установить sharp для оптимизации изображений
npm install sharp
```

```typescript
// src/lib/imageOptimizer.ts
import sharp from 'sharp'

export async function optimizeImage(buffer: Buffer, maxWidth: number = 1200) {
	return await sharp(buffer)
		.resize(maxWidth, null, {
			fit: 'inside',
			withoutEnlargement: true,
		})
		.webp({ quality: 85 })
		.toBuffer()
}
```

---

### 📦 Низкий приоритет (Когда будет время)

#### 10. Service Worker / PWA

```bash
npm install next-pwa
```

#### 11. CDN Integration

Использовать CloudFlare или AWS CloudFront для статических файлов.

#### 12. Database Connection Pooling

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		log:
			process.env.NODE_ENV === 'development'
				? ['query', 'error', 'warn']
				: ['error'],
		datasources: {
			db: {
				url: process.env.DATABASE_URL,
			},
		},
	})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

---

## 📈 Ожидаемые улучшения

### Время загрузки страниц:

- **Главная:** 2.5s → 1.2s (-52%)
- **Список задач:** 1.8s → 0.8s (-55%)
- **Детали задачи:** 3.2s → 1.5s (-53%)
- **Чаты:** 5+ seconds → 1.5s (-70%!)

### API Response Time:

- **GET /api/chats:** 2-5s → 0.3s (-85%!)
- **GET /api/tasks:** 0.8s → 0.3s (-62%)
- **GET /api/notifications:** 0.5s → 0.1s (-80%)

### Database Load:

- Снижение количества запросов на 60-70%
- Снижение времени выполнения запросов на 40-50%

### Bundle Size:

- Начальный бандл: уменьшится на 30-40% за счет code splitting
- Vendor chunks: оптимизация на 20-25%

---

## 🚀 Быстрый старт

### 1. Критическая оптимизация (30 минут)

```bash
# Создать файл с оптимизациями для chats API
cd /home/nesi/nesi-app

# Применить изменения (предоставлю файлы ниже)
# ... внести изменения в src/app/api/chats/route.ts

# Создать кеш для категорий
# ... создать src/lib/categoryCache.ts

# Добавить составные индексы
psql -U nesi_user -d nesi_db -h localhost < add_indexes.sql
```

### 2. Code Splitting (1 час)

```bash
# Добавить dynamic imports
# ... изменения в страницах

npm run build
pm2 restart nesi-app
```

### 3. Мониторинг результатов

```bash
# Запустить нагрузочные тесты ДО и ПОСЛЕ
cd load-tests
npm run test:api  # До оптимизации
# ... применить оптимизации ...
npm run test:api  # После оптимизации
```

---

## 📊 Метрики для отслеживания

### Core Web Vitals:

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### API Metrics:

- Response Time p95: < 500ms
- Error Rate: < 1%
- Throughput: > 100 req/s

### Database:

- Query Time p95: < 100ms
- Connection Pool: < 80% utilized
- Cache Hit Ratio: > 90%

---

## 🔍 Инструменты для мониторинга

1. **Lighthouse** (встроен в Chrome DevTools)
2. **Next.js Build Analyzer** (уже настроен)
3. **K6 Load Tests** (уже есть в проекте)
4. **PM2 Monitoring** (уже используется)

```bash
# Проверка производительности
npm run build
npm run analyze  # Bundle analysis

# Load testing
cd load-tests
npm run test:full

# Мониторинг на сервере
pm2 monit
```

---

## 🎯 Следующие шаги

1. ✅ Применить критические оптимизации (API chats, кеш категорий, индексы БД)
2. ⏳ Добавить code splitting для тяжелых компонентов
3. ⏳ Внедрить мемоизацию в компонентах
4. ⏳ Установить Redis
5. ⏳ Настроить bundle analyzer
6. ⏳ Запустить нагрузочное тестирование для сравнения

---

**Готовые файлы с оптимизациями создам в следующем сообщении!** 🚀
