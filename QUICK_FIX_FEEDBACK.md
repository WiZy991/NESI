# 🔧 Быстрое исправление: Обратная связь в админке

## ❌ Проблема
При переходе на `/admin/feedback` ошибка **403 Forbidden** - "Доступ запрещён"

## 🐛 Причина
В JWT токене не сохранялась роль пользователя, поэтому проверка `payload.role !== 'admin'` не проходила.

## ✅ Решение

### 1. Обновите код на сервере
```bash
cd /home/nesi/nesi-app
git pull
npm run build
pm2 restart nesi-app
```

### 2. **Обязательно!** Разлогиньтесь и войдите снова
Важно: старый токен не содержит роль, нужен новый!

1. Нажмите "Выйти" в меню
2. Войдите снова
3. Откройте `/admin/feedback`

### 3. Если проблема осталась
Проверьте логи:
```bash
pm2 logs nesi-app --lines 50 | grep feedback
```

Должно быть:
```
✅ Аутентификация прошла успешно
✅ Получено X отзывов
```

Если ошибка:
```
❌ Не админ. Роль: user
```
→ Пользователь не админ, проверьте role в БД

## 📊 Проверка в БД
```sql
SELECT id, email, role FROM "User" WHERE email = 'your@email.com';
```

Роль должна быть `admin`.

## 🎯 Изменения в коде

### Было:
```typescript
signJWT({ userId: user.id }) // ❌ Роль не сохраняется
```

### Стало:
```typescript
signJWT({ userId: user.id, role: user.role }) // ✅ Роль сохраняется
```

### Fallback для старых токенов:
```typescript
let userRole = (payload as any).role
if (!userRole) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  userRole = user?.role
}
```

## ✅ После исправления
- Новые токены содержат роль
- Старые токены работают через fallback к БД
- Админ-панель открывается без 403

