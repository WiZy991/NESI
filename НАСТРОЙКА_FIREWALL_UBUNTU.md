# 🔒 Настройка Firewall для Т-Банка на Ubuntu

## 📋 IP адреса Т-Банка для whitelist

Согласно документации, webhook приходят с IP:

```
91.194.226.0/23
91.218.132.0/22
212.233.80.0/22
```

---

## 🛡️ Вариант 1: UFW (рекомендуется)

UFW (Uncomplicated Firewall) - стандартный firewall для Ubuntu.

### Проверка статуса UFW

```bash
sudo ufw status
```

Если UFW не активен:

```bash
sudo ufw enable
```

### Добавление правил для Т-Банка

```bash
# Разрешаем входящие запросы от IP Т-Банка на порт 443 (HTTPS)
sudo ufw allow from 91.194.226.0/23 to any port 443 proto tcp comment 'TBank Webhook 1'
sudo ufw allow from 91.218.132.0/22 to any port 443 proto tcp comment 'TBank Webhook 2'
sudo ufw allow from 212.233.80.0/22 to any port 443 proto tcp comment 'TBank Webhook 3'
```

### Проверка добавленных правил

```bash
sudo ufw status numbered
```

Вы должны увидеть что-то вроде:

```
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 443/tcp                    ALLOW IN    91.194.226.0/23     # TBank Webhook 1
[ 2] 443/tcp                    ALLOW IN    91.218.132.0/22     # TBank Webhook 2
[ 3] 443/tcp                    ALLOW IN    212.233.80.0/22     # TBank Webhook 3
```

### Перезагрузка UFW (если нужно)

```bash
sudo ufw reload
```

---

## 🔧 Вариант 2: iptables (для продвинутых)

Если вы используете iptables напрямую:

```bash
# Разрешаем входящие от IP Т-Банка
sudo iptables -A INPUT -p tcp -s 91.194.226.0/23 --dport 443 -j ACCEPT -m comment --comment "TBank Webhook 1"
sudo iptables -A INPUT -p tcp -s 91.218.132.0/22 --dport 443 -j ACCEPT -m comment --comment "TBank Webhook 2"
sudo iptables -A INPUT -p tcp -s 212.233.80.0/22 --dport 443 -j ACCEPT -m comment --comment "TBank Webhook 3"

# Сохранить правила
sudo netfilter-persistent save
# Или для старых систем:
sudo iptables-save > /etc/iptables/rules.v4
```

---

## 🌐 Если используете Nginx

Дополнительно можно ограничить доступ к webhook endpoint только для IP Т-Банка в конфигурации Nginx:

### Создайте файл с IP адресами

```bash
sudo nano /etc/nginx/tbank-whitelist.conf
```

Добавьте:

```nginx
# IP адреса Т-Банка для webhook
allow 91.194.226.0/23;
allow 91.218.132.0/22;
allow 212.233.80.0/22;
deny all;
```

### Обновите конфигурацию сайта

```bash
sudo nano /etc/nginx/sites-available/nesi.su
```

Добавьте для webhook endpoint:

```nginx
server {
    listen 443 ssl http2;
    server_name nesi.su;

    # ... другие настройки ...

    # Ограничение доступа к webhook только для Т-Банка
    location /api/tbank/webhook {
        include /etc/nginx/tbank-whitelist.conf;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Остальные API доступны всем
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ... остальная конфигурация ...
}
```

### Проверка и перезагрузка Nginx

```bash
# Проверка синтаксиса
sudo nginx -t

# Перезагрузка
sudo systemctl reload nginx
```

---

## ✅ Проверка работы

### 1. Проверить UFW

```bash
sudo ufw status verbose
```

### 2. Тест доступности webhook

С разрешенного IP (должно работать):

```bash
# С сервера Т-Банка (симуляция)
curl -X POST https://nesi.su/api/tbank/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}'
```

Должно вернуть: `OK`

### 3. Проверить логи Nginx

```bash
sudo tail -f /var/log/nginx/access.log | grep webhook
```

### 4. Проверить логи приложения

```bash
pm2 logs nesi | grep "TBank Webhook"
```

---

## 🚨 Важные замечания

### 1. Порт 443 (HTTPS)

Webhook от Т-Банка приходит ТОЛЬКО по HTTPS (порт 443).  
Убедитесь, что:

- SSL сертификат установлен для nesi.su
- Порт 443 открыт в firewall

### 2. Не блокируйте полностью

Если вы используете `deny all` по умолчанию, убедитесь что:

- Порт 443 открыт для всех (для обычных пользователей)
- IP Т-Банка разрешены явно

### 3. IPv6 (если используется)

Т-Банк может использовать IPv6. Проверьте документацию или у техподдержки.

---

## 🔍 Troubleshooting

### Webhook не приходит

**Проверьте 1:** Firewall

```bash
sudo ufw status | grep 443
sudo ufw status | grep 91.194
sudo ufw status | grep 91.218
sudo ufw status | grep 212.233
```

**Проверьте 2:** Доступность извне

```bash
# С другого сервера/компьютера
curl -I https://nesi.su/api/tbank/webhook
```

**Проверьте 3:** Логи

```bash
# Nginx
sudo tail -50 /var/log/nginx/error.log

# Application
pm2 logs nesi --lines 50
```

### Ошибка 403 Forbidden

Возможно IP заблокирован. Временно уберите ограничения Nginx:

```bash
# Закомментируйте include /etc/nginx/tbank-whitelist.conf
sudo nano /etc/nginx/sites-available/nesi.su
sudo systemctl reload nginx
```

---

## 📝 Команды одной строкой

### Быстрая настройка UFW

```bash
sudo ufw allow from 91.194.226.0/23 to any port 443 proto tcp comment 'TBank' && \
sudo ufw allow from 91.218.132.0/22 to any port 443 proto tcp comment 'TBank' && \
sudo ufw allow from 212.233.80.0/22 to any port 443 proto tcp comment 'TBank' && \
sudo ufw reload && \
sudo ufw status | grep TBank
```

### Проверка доступности

```bash
# Проверить что webhook endpoint доступен
curl -X POST https://nesi.su/api/tbank/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}' && \
echo "✅ Webhook доступен"
```

---

## 🎯 Рекомендуемая конфигурация для nesi.su

### UFW правила

```bash
# Базовые правила (если еще не настроены)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (обязательно!)
sudo ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS для всех пользователей
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# IP Т-Банка для webhook (дополнительно, для логирования)
sudo ufw allow from 91.194.226.0/23 to any port 443 comment 'TBank Webhook 1'
sudo ufw allow from 91.218.132.0/22 to any port 443 comment 'TBank Webhook 2'
sudo ufw allow from 212.233.80.0/22 to any port 443 comment 'TBank Webhook 3'

# Активировать
sudo ufw enable

# Проверить
sudo ufw status verbose
```

---

## 📞 Поддержка

**Если webhook не работает:**

1. Свяжитесь с поддержкой Т-Банка: `acq_help@tbank.ru`
2. Укажите:
   - Ваш сайт: `https://nesi.su`
   - Webhook URL: `https://nesi.su/api/tbank/webhook`
   - IP вашего сервера
   - Логи ошибок

---

## ✅ Готово!

После выполнения команд Т-Банк сможет отправлять webhook на ваш сервер nesi.su.

**Проверьте:** Сделайте тестовую транзакцию и смотрите логи:

```bash
pm2 logs nesi --lines 100 | grep "Webhook"
```
