#!/bin/bash

# Скрипт для запуска всех нагрузочных тестов
# Использование: ./run-tests.sh [environment] [output-dir]

set -e

# Конфигурация
ENVIRONMENT=${1:-"local"}
OUTPUT_DIR=${2:-"results"}
BASE_URL="https://nesi-production.up.railway.app/"

# Настройка URL в зависимости от окружения
case $ENVIRONMENT in
  "local")
    BASE_URL="http://localhost:3000"
    ;;
  "staging")
    BASE_URL="https://staging.nesi.com"
    ;;
  "production")
    BASE_URL="https://nesi-production.up.railway.app/"
    ;;
  *)
    echo "Неизвестное окружение: $ENVIRONMENT"
    echo "Доступные: local, staging, production"
    exit 1
    ;;
esac

echo "🚀 Запуск нагрузочных тестов для окружения: $ENVIRONMENT"
echo "📡 Базовый URL: $BASE_URL"
echo "📁 Результаты будут сохранены в: $OUTPUT_DIR"

# Создание директории для результатов
mkdir -p $OUTPUT_DIR

# Функция для запуска теста
run_test() {
  local test_name=$1
  local test_file=$2
  local description=$3
  
  echo ""
  echo "🧪 Запуск теста: $test_name"
  echo "📝 Описание: $description"
  echo "⏱️  Начало: $(date)"
  
  # Запуск теста с сохранением результатов
  k6 run \
    --env BASE_URL=$BASE_URL \
    --out json=$OUTPUT_DIR/${test_name}-results.json \
    --out csv=$OUTPUT_DIR/${test_name}-results.csv \
    $test_file > $OUTPUT_DIR/${test_name}-output.log 2>&1
  
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo "✅ Тест $test_name завершен успешно"
  else
    echo "❌ Тест $test_name завершен с ошибками (код: $exit_code)"
  fi
  
  echo "⏱️  Конец: $(date)"
  echo "📊 Результаты сохранены в $OUTPUT_DIR/${test_name}-*"
}

# Функция для генерации сводного отчета
generate_summary() {
  echo ""
  echo "📋 Генерация сводного отчета..."
  
  cat > $OUTPUT_DIR/summary.md << EOF
# Сводный отчет нагрузочных тестов

**Окружение**: $ENVIRONMENT  
**Базовый URL**: $BASE_URL  
**Дата проведения**: $(date)  
**Директория результатов**: $OUTPUT_DIR

## Выполненные тесты

EOF

  # Добавляем информацию о каждом тесте
  for test_file in *.js; do
    if [ "$test_file" != "config.js" ]; then
      test_name=$(basename $test_file .js)
      if [ -f "$OUTPUT_DIR/${test_name}-results.json" ]; then
        echo "- ✅ $test_name" >> $OUTPUT_DIR/summary.md
      else
        echo "- ❌ $test_name (не выполнен)" >> $OUTPUT_DIR/summary.md
      fi
    fi
  done

  cat >> $OUTPUT_DIR/summary.md << EOF

## Анализ результатов

### Ключевые метрики
- Проверьте файлы \`*-results.json\` для детального анализа
- Логи выполнения находятся в файлах \`*-output.log\`
- CSV данные для импорта в Excel/Google Sheets: \`*-results.csv\`

### Рекомендации
1. Обратите внимание на тесты с высоким процентом ошибок
2. Проверьте время ответа (p95) для каждого endpoint
3. Убедитесь, что rate limiting работает корректно
4. Проанализируйте производительность кеширования

## Следующие шаги
1. Проанализируйте результаты каждого теста
2. Выявите узкие места в производительности
3. Внедрите оптимизации на основе результатов
4. Повторите тесты после оптимизации

---
*Отчет сгенерирован автоматически $(date)*
EOF

  echo "📋 Сводный отчет сохранен в $OUTPUT_DIR/summary.md"
}

# Проверка наличия k6
if ! command -v k6 &> /dev/null; then
    echo "❌ K6 не установлен. Установите K6 перед запуском тестов."
    echo "📖 Инструкции по установке: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Проверка доступности сервера
echo "🔍 Проверка доступности сервера..."
if curl -s --head $BASE_URL > /dev/null; then
    echo "✅ Сервер доступен"
else
    echo "❌ Сервер недоступен: $BASE_URL"
    echo "Убедитесь, что сервер запущен и доступен"
    exit 1
fi

# Запуск тестов
echo ""
echo "🎯 Начинаем выполнение тестов..."

# 1. Тест аутентификации
run_test "auth-load" "auth-load-test.js" "Проверка производительности логина/регистрации"

# 2. Тест API
run_test "api-load" "api-load-test.js" "Проверка производительности основных API endpoints"

# 3. Стресс-тест
run_test "stress" "stress-test.js" "Проверка поведения под экстремальной нагрузкой"

# 4. Спайк-тест
run_test "spike" "spike-test.js" "Проверка реакции на резкие скачки нагрузки"

# 5. Объемный тест
run_test "volume" "volume-test.js" "Проверка обработки большого количества запросов"

# 6. Тест на выносливость (только для staging/production)
if [ "$ENVIRONMENT" != "local" ]; then
    run_test "endurance" "endurance-test.js" "Проверка стабильности при длительной нагрузке"
fi

# 7. Полный тест
run_test "full-load" "full-load-test.js" "Комплексная проверка всех операций"

# Генерация сводного отчета
generate_summary

echo ""
echo "🎉 Все тесты завершены!"
echo "📁 Результаты сохранены в директории: $OUTPUT_DIR"
echo "📋 Сводный отчет: $OUTPUT_DIR/summary.md"
echo ""
echo "📊 Для анализа результатов:"
echo "   - JSON файлы: детальные метрики"
echo "   - CSV файлы: данные для графиков"
echo "   - Логи: информация об ошибках"
echo "   - Summary: общая сводка"
echo ""
echo "🔍 Рекомендуется проанализировать:"
echo "   1. Процент ошибок в каждом тесте"
echo "   2. Время ответа (p95) для критичных операций"
echo "   3. Эффективность rate limiting"
echo "   4. Производительность кеширования"

