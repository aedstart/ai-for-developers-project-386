@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo   Docker Compose Management Script
echo ==========================================
echo.

if "%1"=="" goto :help
if "%1"=="watch" goto :watch
if "%1"=="dev" goto :dev
if "%1"=="build" goto :build
if "%1"=="stop" goto :stop
if "%1"=="logs" goto :logs
goto :help

:watch
echo 🚀 Запуск с автоматической пересборкой (watch mode)...
echo Изменения в коде = автоматическая пересборка контейнера
docker-compose up --build --watch
exit /b

:dev
echo 🚀 Запуск режима разработки (hot-reload, без пересборки)...
echo Быстрый режим - изменения применяются мгновенно
docker-compose -f docker-compose.dev.yml up --build
exit /b

:build
echo 🔨 Ручная пересборка всех контейнеров...
docker-compose up --build -d
echo ✅ Контейнеры пересобраны и запущены!
exit /b

:stop
echo 🛑 Остановка всех контейнеров...
docker-compose down
docker-compose -f docker-compose.dev.yml down
echo ✅ Контейнеры остановлены!
exit /b

:logs
echo 📋 Просмотр логов...
docker-compose logs -f
exit /b

:help
echo Использование: docker-manage.bat [команда]
echo.
echo Команды:
echo   watch  - Автопересборка при изменениях (рекомендуется)
echo   dev    - Быстрый режим разработки (hot-reload)
echo   build  - Ручная пересборка
echo   stop   - Остановка всех контейнеров
echo   logs   - Просмотр логов
echo.
echo Примеры:
echo   docker-manage.bat watch  - Запуск с автообновлением
echo   docker-manage.bat dev    - Быстрая разработка
echo   docker-manage.bat stop   - Остановка
echo.
exit /b
