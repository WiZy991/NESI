#!/bin/bash

# ============================================
# Скрипт восстановления базы данных из бэкапа
# ============================================

# Конфигурация
DB_USER="nesi_user"
DB_NAME="nesi_db"
BACKUP_DIR="/home/nesi/backups"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🔄 Восстановление базы данных${NC}"
echo -e "${BLUE}============================================${NC}"

# Проверка наличия директории с бэкапами
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Директория с бэкапами не найдена: $BACKUP_DIR${NC}"
    exit 1
fi

# Показать список доступных бэкапов
echo -e "\n${YELLOW}📦 Доступные бэкапы:${NC}"
BACKUPS=($(ls -t $BACKUP_DIR/nesi_db_*.sql.gz 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ Бэкапы не найдены в $BACKUP_DIR${NC}"
    exit 1
fi

# Показать список с номерами
for i in "${!BACKUPS[@]}"; do
    SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    DATE=$(basename "${BACKUPS[$i]}" | sed 's/nesi_db_\(.*\)\.sql\.gz/\1/')
    echo -e "  ${BLUE}[$((i+1))]${NC} $DATE (размер: $SIZE)"
done

# Запросить выбор пользователя
echo -e "\n${YELLOW}Выберите номер бэкапа для восстановления (или 'q' для выхода):${NC}"
read -p "Номер: " CHOICE

# Проверка выбора
if [ "$CHOICE" = "q" ] || [ "$CHOICE" = "Q" ]; then
    echo -e "${YELLOW}Отменено${NC}"
    exit 0
fi

# Валидация выбора
if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt ${#BACKUPS[@]} ]; then
    echo -e "${RED}❌ Неверный выбор${NC}"
    exit 1
fi

# Получить выбранный файл
SELECTED_BACKUP="${BACKUPS[$((CHOICE-1))]}"
echo -e "\n${BLUE}Выбран бэкап:${NC} $(basename $SELECTED_BACKUP)"

# Подтверждение
echo -e "\n${RED}⚠️  ВНИМАНИЕ: Все текущие данные в базе $DB_NAME будут удалены!${NC}"
read -p "Вы уверены? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Отменено${NC}"
    exit 0
fi

# Создать бэкап текущей БД перед восстановлением
echo -e "\n${YELLOW}📦 Создаю резервную копию текущей базы данных...${NC}"
CURRENT_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -U $DB_USER $DB_NAME > $CURRENT_BACKUP
gzip $CURRENT_BACKUP
echo -e "${GREEN}✅ Текущая база сохранена: ${CURRENT_BACKUP}.gz${NC}"

# Восстановление
echo -e "\n${YELLOW}🔄 Восстанавливаю базу данных из бэкапа...${NC}"

# Распаковать и восстановить
if zcat $SELECTED_BACKUP | psql -U $DB_USER $DB_NAME > /dev/null 2>&1; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}✅ База данных успешно восстановлена!${NC}"
    echo -e "${GREEN}============================================${NC}"
    
    # Показать информацию о БД
    echo -e "\n${BLUE}📊 Информация о базе данных:${NC}"
    psql -U $DB_USER -d $DB_NAME -c "\dt" 2>/dev/null | head -20
    
    # Рекомендация
    echo -e "\n${YELLOW}💡 Рекомендуется перезапустить приложение:${NC}"
    echo -e "   ${BLUE}pm2 restart nesi-app${NC}"
    
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}❌ Ошибка при восстановлении базы данных!${NC}"
    echo -e "${RED}============================================${NC}"
    
    echo -e "\n${YELLOW}💡 Попробуйте восстановить из резервной копии:${NC}"
    echo -e "   ${BLUE}zcat ${CURRENT_BACKUP}.gz | psql -U $DB_USER $DB_NAME${NC}"
    
    exit 1
fi

