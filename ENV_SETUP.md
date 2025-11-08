# Настройка переменных окружения

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# База данных
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth (для аутентификации)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Email (для уведомлений)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@yourdomain.com"

# ЮKassa (Платежная система) - НОВОЕ!
YOOKASSA_SHOP_ID="your_shop_id"
YOOKASSA_SECRET_KEY="your_secret_key"

# URL сайта (для возврата после оплаты)
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
# В продакшене: NEXT_PUBLIC_BASE_URL="https://yourdomain.com"

# Cron / фоновые задания
# Используется для доступа к служебным эндпоинтам (например, автонапоминания по откликам)
CRON_SECRET="set-strong-cron-secret"
```

## Получение данных ЮKassa

1. Зарегистрируйтесь на https://yookassa.ru/
2. Создайте магазин
3. Перейдите в "Настройки" → "Токены для API"
4. Скопируйте Shop ID и Secret Key
5. Вставьте в `.env` файл
