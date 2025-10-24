#!/bin/bash

# ============================================
# Скрипт резервного копирования базы данных
# ============================================

# Конфигурация
DB_USER="nesi_user"
DB_NAME="nesi_db"
BACKUP_DIR="/home/nesi/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nesi_db_$DATE.sql"
RETENTION_DAYS=7

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Создать директорию для бэкапов если не существует
mkdir -p $BACKUP_DIR

echo -e "${YELLOW}🔄 Начинаю резервное копирование базы данных...${NC}"

# Создать бэкап
if pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE; then
    # Сжать бэкап
    gzip $BACKUP_FILE
    
    # Получить размер файла
    SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    
    echo -e "${GREEN}✅ Бэкап успешно создан: $BACKUP_FILE.gz (размер: $SIZE)${NC}"
    
    # Удалить старые бэкапы
    DELETED=$(find $BACKUP_DIR -name "nesi_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    
    if [ $DELETED -gt 0 ]; then
        echo -e "${YELLOW}🗑️  Удалено старых бэкапов: $DELETED${NC}"
    fi
    
    # Показать список бэкапов
    echo -e "${YELLOW}📦 Существующие бэкапы:${NC}"
    ls -lh $BACKUP_DIR/nesi_db_*.sql.gz | tail -5
    
else
    echo -e "${RED}❌ Ошибка при создании бэкапа!${NC}"
    exit 1
fi

echo -e "${GREEN}✨ Готово!${NC}"

