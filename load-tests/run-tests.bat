@echo off
REM Скрипт для запуска всех нагрузочных тестов на Windows
REM Использование: run-tests.bat [environment] [output-dir]

setlocal enabledelayedexpansion

REM Конфигурация
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=local

set OUTPUT_DIR=%2
if "%OUTPUT_DIR%"=="" set OUTPUT_DIR=results

set BASE_URL=

REM Настройка URL в зависимости от окружения
if "%ENVIRONMENT%"=="local" (
    set BASE_URL=http://localhost:3000
) else if "%ENVIRONMENT%"=="staging" (
    set BASE_URL=https://staging.nesi.com
) else if "%ENVIRONMENT%"=="production" (
    set BASE_URL=https://nesi.com
) else (
    echo Неизвестное окружение: %ENVIRONMENT%
    echo Доступные: local, staging, production
    exit /b 1
)

echo 🚀 Запуск нагрузочных тестов для окружения: %ENVIRONMENT%
echo 📡 Базовый URL: %BASE_URL%
echo 📁 Результаты будут сохранены в: %OUTPUT_DIR%

REM Создание директории для результатов
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Функция для запуска теста
:run_test
set test_name=%1
set test_file=%2
set description=%3

echo.
echo 🧪 Запуск теста: %test_name%
echo 📝 Описание: %description%
echo ⏱️  Начало: %date% %time%

REM Запуск теста с сохранением результатов
k6 run --env BASE_URL=%BASE_URL% --out json=%OUTPUT_DIR%/%test_name%-results.json --out csv=%OUTPUT_DIR%/%test_name%-results.csv %test_file% > %OUTPUT_DIR%/%test_name%-output.log 2>&1

if %errorlevel% equ 0 (
    echo ✅ Тест %test_name% завершен успешно
) else (
    echo ❌ Тест %test_name% завершен с ошибками (код: %errorlevel%)
)

echo ⏱️  Конец: %date% %time%
echo 📊 Результаты сохранены в %OUTPUT_DIR%/%test_name%-*
goto :eof

REM Проверка наличия k6
k6 version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ K6 не установлен. Установите K6 перед запуском тестов.
    echo 📖 Инструкции по установке: https://k6.io/docs/getting-started/installation/
    exit /b 1
)

REM Проверка доступности сервера
echo 🔍 Проверка доступности сервера...
curl -s --head %BASE_URL% >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Сервер доступен
) else (
    echo ❌ Сервер недоступен: %BASE_URL%
    echo Убедитесь, что сервер запущен и доступен
    exit /b 1
)

REM Запуск тестов
echo.
echo 🎯 Начинаем выполнение тестов...

call :run_test "auth-load" "auth-load-test.js" "Проверка производительности логина/регистрации"
call :run_test "api-load" "api-load-test.js" "Проверка производительности основных API endpoints"
call :run_test "stress" "stress-test.js" "Проверка поведения под экстремальной нагрузкой"
call :run_test "spike" "spike-test.js" "Проверка реакции на резкие скачки нагрузки"
call :run_test "volume" "volume-test.js" "Проверка обработки большого количества запросов"

REM Тест на выносливость только для staging/production
if not "%ENVIRONMENT%"=="local" (
    call :run_test "endurance" "endurance-test.js" "Проверка стабильности при длительной нагрузке"
)

call :run_test "full-load" "full-load-test.js" "Комплексная проверка всех операций"

REM Генерация сводного отчета
echo.
echo 📋 Генерация сводного отчета...

(
echo # Сводный отчет нагрузочных тестов
echo.
echo **Окружение**: %ENVIRONMENT%
echo **Базовый URL**: %BASE_URL%
echo **Дата проведения**: %date% %time%
echo **Директория результатов**: %OUTPUT_DIR%
echo.
echo ## Выполненные тесты
echo.
echo - ✅ auth-load
echo - ✅ api-load
echo - ✅ stress
echo - ✅ spike
echo - ✅ volume
if not "%ENVIRONMENT%"=="local" echo - ✅ endurance
echo - ✅ full-load
echo.
echo ## Анализ результатов
echo.
echo ### Ключевые метрики
echo - Проверьте файлы `*-results.json` для детального анализа
echo - Логи выполнения находятся в файлах `*-output.log`
echo - CSV данные для импорта в Excel/Google Sheets: `*-results.csv`
echo.
echo ### Рекомендации
echo 1. Обратите внимание на тесты с высоким процентом ошибок
echo 2. Проверьте время ответа (p95) для каждого endpoint
echo 3. Убедитесь, что rate limiting работает корректно
echo 4. Проанализируйте производительность кеширования
echo.
echo ## Следующие шаги
echo 1. Проанализируйте результаты каждого теста
echo 2. Выявите узкие места в производительности
echo 3. Внедрите оптимизации на основе результатов
echo 4. Повторите тесты после оптимизации
echo.
echo ---
echo *Отчет сгенерирован автоматически %date% %time%*
) > %OUTPUT_DIR%\summary.md

echo 📋 Сводный отчет сохранен в %OUTPUT_DIR%\summary.md

echo.
echo 🎉 Все тесты завершены!
echo 📁 Результаты сохранены в директории: %OUTPUT_DIR%
echo 📋 Сводный отчет: %OUTPUT_DIR%\summary.md
echo.
echo 📊 Для анализа результатов:
echo    - JSON файлы: детальные метрики
echo    - CSV файлы: данные для графиков
echo    - Логи: информация об ошибках
echo    - Summary: общая сводка
echo.
echo 🔍 Рекомендуется проанализировать:
echo    1. Процент ошибок в каждом тесте
echo    2. Время ответа (p95) для критичных операций
echo    3. Эффективность rate limiting
echo    4. Производительность кеширования

pause
