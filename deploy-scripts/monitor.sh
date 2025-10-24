#!/bin/bash

# ============================================
# Скрипт мониторинга приложения в реальном времени
# ============================================

# Конфигурация
APP_NAME="nesi-app"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для отображения статистики
show_stats() {
    clear
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}📊 Мониторинг приложения NESI${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo -e "Обновлено: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # PM2 статус
    echo -e "\n${YELLOW}🔷 PM2 Процессы:${NC}"
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) | CPU: \(.monit.cpu)% | Mem: \(.monit.memory / 1024 / 1024 | round)MB | Restart: \(.pm2_env.restart_time)"' 2>/dev/null || pm2 status
    
    # Системная информация
    echo -e "\n${YELLOW}💻 Система:${NC}"
    echo -e "  CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
    echo -e "  RAM: $(free -h | awk '/^Mem:/ {print $3 " / " $2 " (" $3/$2*100 "%)"}')"
    echo -e "  Disk: $(df -h / | awk 'NR==2 {print $3 " / " $2 " (" $5 ")"}')"
    
    # Активные соединения
    echo -e "\n${YELLOW}🔌 Активные подключения (порт 3000):${NC}"
    CONNECTIONS=$(netstat -an 2>/dev/null | grep ":3000" | grep ESTABLISHED | wc -l)
    echo -e "  Всего: $CONNECTIONS"
    
    # PostgreSQL
    echo -e "\n${YELLOW}🗄️  PostgreSQL:${NC}"
    if systemctl is-active --quiet postgresql; then
        echo -e "  Статус: ${GREEN}✅ Работает${NC}"
        CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='nesi_db';" 2>/dev/null | xargs)
        echo -e "  Активные соединения: $CONNECTIONS"
    else
        echo -e "  Статус: ${RED}❌ Не работает${NC}"
    fi
    
    # Nginx
    echo -e "\n${YELLOW}🌐 Nginx:${NC}"
    if systemctl is-active --quiet nginx; then
        echo -e "  Статус: ${GREEN}✅ Работает${NC}"
        # Последние HTTP коды из access.log
        if [ -f /var/log/nginx/nesi-access.log ]; then
            echo -e "  Последние запросы (коды ответа):"
            tail -5 /var/log/nginx/nesi-access.log | awk '{print "    " $9 " - " $7}' 2>/dev/null
        fi
    else
        echo -e "  Статус: ${RED}❌ Не работает${NC}"
    fi
    
    # Последние логи приложения
    echo -e "\n${YELLOW}📜 Последние логи (5 строк):${NC}"
    pm2 logs $APP_NAME --nostream --lines 5 2>/dev/null | tail -5
    
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "Нажмите ${YELLOW}Ctrl+C${NC} для выхода"
    echo -e "${BLUE}============================================${NC}"
}

# Проверка наличия jq (для красивого вывода JSON)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  Установите 'jq' для улучшенного отображения: sudo apt install jq${NC}"
    sleep 2
fi

# Основной цикл
while true; do
    show_stats
    sleep 5
done

