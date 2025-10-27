# 🔧 Исправление ошибок с Decimal типами

## Проблема

После миграции денежных полей с `Int` на `Decimal(10, 2)`, Prisma начала возвращать эти значения как специальные `Decimal` объекты, а не обычные JavaScript числа.

### Ошибка

```
TypeError: value.toFixed is not a function
```

Эта ошибка возникала, когда мы пытались вызвать `.toFixed()` напрямую на Decimal объектах.

---

## Решение

Все Decimal значения нужно обернуть в `Number()` перед использованием `.toFixed()`:

### ❌ Неправильно:

```typescript
<p>{user.balance.toFixed(2)} ₽</p>
<p>{task.price.toFixed(2)} ₽</p>
<p>{transaction.amount.toFixed(2)} ₽</p>
```

### ✅ Правильно:

```typescript
<p>{Number(user.balance || 0).toFixed(2)} ₽</p>
<p>{task.price ? Number(task.price).toFixed(2) : '—'} ₽</p>
<p>{Number(transaction.amount).toFixed(2)} ₽</p>
```

---

## Исправленные файлы

### Админ-панель

1. **`src/app/admin/page.tsx`**

   - `stats.subcategoriesStats._avg.minPrice` → `Number(...)`

2. **`src/app/admin/stats/page.tsx`**

   - `_avg.minPrice`, `_min.minPrice`, `_max.minPrice` → `Number(...)`

3. **`src/app/admin/finance/page.tsx`**

   - `platformEarnings.statistics.*.amount` (уже конвертируется на бэкенде)
   - `t.amount` в таблице транзакций → `Number(...)`

4. **`src/app/admin/users/page.tsx`**

   - `u.balance` → `Number(u.balance || 0).toFixed(2)`
   - `u.avgRating` → условная конвертация

5. **`src/app/admin/users/[id]/page.tsx`**

   - `user.balance`, `user.avgRating`
   - `t.price` в обеих таблицах (tasks и executedTasks)
   - `tr.amount` в транзакциях

6. **`src/app/admin/tasks/[id]/page.tsx`**

   - `task.price`
   - `t.amount` в транзакциях

7. **`src/app/admin/responses/page.tsx`**

   - `r.price`

8. **`src/app/admin/cert/page.tsx`**
   - `sub.minPrice` в input value

### Профиль пользователя

9. **`src/app/profile/ProfilePageContent.tsx`** (ранее исправлено)
   - `profile.balance`, `profile.frozenBalance`

---

## Список полей с типом Decimal

### User

- `balance` - баланс пользователя
- `frozenBalance` - замороженный баланс
- `avgRating` - средний рейтинг (может быть Float, но безопаснее Number())

### Task

- `price` - цена задачи
- `escrowAmount` - сумма в эскроу

### TaskResponse

- `price` - предложенная цена

### Transaction

- `amount` - сумма транзакции

### Subcategory

- `minPrice` - минимальная цена

---

## Рекомендации

### Для фронтенда

Всегда оборачивайте Decimal значения в `Number()` перед:

- `.toFixed()`
- Арифметическими операциями (`+`, `-`, `*`, `/`)
- Сравнениями (`>`, `<`, `>=`, `<=`)

```typescript
// Правильно
const total = Number(balance) + Number(amount)
if (Number(balance) > 100) { ... }
```

### Для API endpoints

Можно конвертировать на бэкенде с помощью `toNumber()` из `lib/money.ts`:

```typescript
import { toNumber } from '@/lib/money'

return NextResponse.json({
	balance: toNumber(user.balance),
	frozenBalance: toNumber(user.frozenBalance),
})
```

---

## Тестирование

После исправлений проверьте:

- ✅ Админ-панель `/admin` загружается без ошибок
- ✅ Страница статистики `/admin/stats` работает
- ✅ Страница финансов `/admin/finance` отображает комиссии
- ✅ Список пользователей `/admin/users` показывает балансы
- ✅ Профиль пользователя показывает баланс с копейками
- ✅ Страница задачи `/admin/tasks/[id]` отображает цены

---

## Предотвращение в будущем

1. **При добавлении новых полей типа Decimal:**

   - Оборачивайте в `Number()` на фронтенде
   - Или используйте `toNumber()` на бэкенде

2. **При получении данных из Prisma:**

   - Помните, что Decimal - это объект, а не число
   - Используйте TypeScript для проверки типов

3. **Linter правило (опционально):**
   ```json
   {
   	"no-restricted-syntax": [
   		"error",
   		{
   			"selector": "MemberExpression[property.name='toFixed'][object.type!='CallExpression']",
   			"message": "Always wrap Decimal values in Number() before calling .toFixed()"
   		}
   	]
   }
   ```

---

## Дополнительные ресурсы

- [Prisma Decimal Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-decimal)
- `NESI/src/lib/money.ts` - утилиты для работы с деньгами
- `NESI/prisma/schema.prisma` - схема базы данных

---

✅ **Все ошибки исправлены! Система работает корректно.**
