[![Actions Status](https://github.com/aedstart/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/aedstart/ai-for-developers-project-386/actions)

# Booking Service

Упрощенный сервис бронирования времени, аналог Cal.com.

## Ссылка на сервис
https://booking-service-frontend.onrender.com/

## Структура проекта

```
booking-service/
├── backend/                 # Node.js + Express + PostgreSQL + Prisma
│   ├── prisma/             # Схема БД и миграции
│   ├── src/                # Исходный код
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Middleware
│   └── Dockerfile
├── frontend/               # React + TypeScript + Vite
│   └── src/                # Исходный код
│       ├── components/     # UI компоненты
│       ├── pages/          # Страницы (User, Owner)
│       └── api/            # API клиент
├── contract/               # TypeSpec/OpenAPI контракт
└── docker-compose.yml      # Docker Compose конфигурация
```

## Технологический стек

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite, date-fns
- **API**: TypeSpec/OpenAPI
- **Контейнеризация**: Docker, Docker Compose

## Быстрый запуск

### 1. Docker Compose (рекомендуется)

```bash
# Клонировать репозиторий
cd booking-service

# Запуск всех сервисов
docker-compose up --build

# Сервер будет доступен:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - PostgreSQL: localhost:5432
```

### 2. Локальный запуск (для разработки)

#### Backend:
```bash
cd backend
npm install

# Установить PostgreSQL и создать базу данных booking_service
# Скопировать .env.example в .env и настроить DATABASE_URL

npx prisma migrate dev
npx prisma db seed
npm run dev
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Функциональность

### Вкладка "Пользователь"
- Просмотр доступных дней в календаре
- Выбор типа встречи (15 или 30 минут)
- Просмотр доступных слотов на ближайшие 14 дней
- Бронирование времени (требуется имя)

### Вкладка "Владелец"
- Управление типами событий (CRUD)
- Настройка рабочих часов (начало/конец)
- Выбор доступных дней через календарь
- Просмотр и управление бронированиями
- Редактирование/отмена бронирований

## API Endpoints

### Event Types
- `GET /api/event-types` - список типов событий
- `GET /api/event-types/:id` - получить тип
- `POST /api/event-types` - создать тип
- `PUT /api/event-types/:id` - обновить тип
- `DELETE /api/event-types/:id` - удалить тип

### Available Days
- `GET /api/available-days` - список доступных дней
- `POST /api/available-days` - установить доступность дня
- `DELETE /api/available-days/:id` - удалить запись

### Working Hours
- `GET /api/working-hours` - получить рабочие часы
- `PUT /api/working-hours` - обновить рабочие часы

### Bookings
- `GET /api/bookings` - список бронирований
- `GET /api/bookings/slots?eventTypeId=` - доступные слоты
- `POST /api/bookings` - создать бронирование
- `PUT /api/bookings/:id` - обновить бронирование
- `DELETE /api/bookings/:id` - отменить бронирование

## Предустановленные данные

При первом запуске автоматически создаются:
- Тип события: "Встреча 15 минут" (15 мин)
- Тип события: "Встреча 30 минут" (30 мин)
- Рабочие часы: 09:00 - 18:00 (Europe/Moscow)

## Особенности

- Фиксированный часовой пояс: Europe/Moscow (Москва)
- Нельзя создать две записи на одно время
- Проверка конфликтов при бронировании
- Слоты генерируются с учетом длительности встречи
- Нельзя бронировать прошедшее время

## База данных

### Модели
- **EventType**: Типы событий (id, name, description, duration)
- **AvailableDay**: Доступные дни (date, isAvailable)
- **WorkingHours**: Рабочие часы (startTime, endTime)
- **Booking**: Бронирования (eventTypeId, startTime, endTime, userName, status)

## Разработка

### Генерация API клиента
```bash
cd contract
tsp compile booking-service.tsp --emit @typespec/openapi3
```

### Миграции Prisma
```bash
cd backend
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

### Сидирование данных
```bash
cd backend
npx prisma db seed
```

## Лицензия

MIT
