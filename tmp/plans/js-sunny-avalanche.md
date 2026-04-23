# Бек на TypeScript для my-tracker

## Context

У Владоса есть трекер задач — фронт на React 19 + Vite + TS в [front/](front/), плюс старый ванильный [app.js](app.js) на 1393 строки, который хранит всё в `localStorage`. Папка [back/](back/) пустая.

Нужен бек, чтобы данные жили не в браузере, а в нормальной БД. Цель — **самый простой и быстрый рабочий вариант**:
- single-user сейчас, но со схемой под мультиюзер в будущем (везде `user_id`)
- крутится **локально** на Node.js
- без вложений (attachments пропускаем)
- без миграции из localStorage (старт с нуля)
- язык — TypeScript (чтоб шарить типы моделей с фронтом)
- CORS решаем через Vite proxy `/api` → бек

## Стек

| Слой | Выбор | Почему |
|---|---|---|
| Runtime | **Node.js** | стандарт, уже есть |
| Язык | **TypeScript** через `tsx` (без сборки в dev) | типы моделей шарим с фронтом |
| Фреймворк | **Hono** + `@hono/node-server` | минимум церемоний, современный API |
| БД | **SQLite** через `better-sqlite3` | один файл `tracker.db`, ноль инфраструктуры |
| ORM | **Drizzle** + `drizzle-kit` | типизация из схемы, простые миграции |
| Валидация | **Zod** | схемы запросов, +0 боли |

## Структура папки back/

```
back/
  src/
    db/
      schema.ts          ← Drizzle-схема таблиц
      client.ts          ← подключение к SQLite
    routes/
      projects.ts        ← CRUD проектов
      tasks.ts           ← CRUD задач
    middleware/
      user.ts            ← пока подставляет DEFAULT_USER_ID = 'me'
    lib/
      id.ts              ← генератор id (nanoid)
    index.ts             ← Hono app + роутер
    env.ts               ← PORT, DB_PATH
  drizzle/               ← автогенерируемые SQL-миграции
  tracker.db             ← файл SQLite (в .gitignore)
  drizzle.config.ts
  tsconfig.json
  package.json
  .gitignore
```

## Схема БД (Drizzle)

Модель взята из [app.js:1-50](app.js#L1-L50), поля приведены к snake_case.

**`projects`**
- `id` text PK
- `user_id` text NOT NULL DEFAULT 'me' (индекс)
- `name` text NOT NULL
- `color` text
- `order` integer NOT NULL DEFAULT 0
- `created_at` integer (unix ms)

**`tasks`**
- `id` text PK
- `user_id` text NOT NULL DEFAULT 'me' (индекс)
- `project_id` text nullable → `projects.id` ON DELETE SET NULL
- `parent_id` text nullable → `tasks.id` ON DELETE CASCADE (подзадачи)
- `title` text NOT NULL
- `description` text
- `date_type` text NOT NULL DEFAULT 'none' (`none`|`day`|`week`|`month`|`year`)
- `date` text (ISO `YYYY-MM-DD`, nullable)
- `status` text NOT NULL DEFAULT 'todo' (`todo`|`in_progress`|`done`)
- `repeat` text NOT NULL DEFAULT 'none'
- `repeat_days` text (JSON-массив, `'[]'` по умолчанию)
- `important` integer (0/1) NOT NULL DEFAULT 0
- `created_at` integer NOT NULL

Вложения и `attachments` намеренно **не заводим** — добавим, когда понадобятся.

## API (REST, префикс `/api`)

**Проекты:**
- `GET    /api/projects`
- `POST   /api/projects` — `{ name, color? }`
- `PATCH  /api/projects/:id` — любые поля
- `DELETE /api/projects/:id`
- `POST   /api/projects/reorder` — `{ ids: string[] }` для drag-n-drop

**Задачи:**
- `GET    /api/tasks?projectId=&date=&status=&parentId=` — фильтры опциональные
- `POST   /api/tasks` — `{ title, ... }`
- `GET    /api/tasks/:id`
- `PATCH  /api/tasks/:id`
- `DELETE /api/tasks/:id`

**Сервисное:**
- `GET    /api/health` — `{ ok: true }` для проверки

Везде в обработчике читаем `user_id` из мидлвары (сейчас константа `'me'`). Когда добавится авторизация — только поменяется мидлвара.

## Пошаговый план развёртывания

**1. Инициализация пакета**
```bash
cd back
npm init -y
```

**2. Установка зависимостей**
```bash
npm i hono @hono/node-server better-sqlite3 drizzle-orm zod nanoid
npm i -D typescript tsx drizzle-kit @types/node @types/better-sqlite3
```

**3. Конфиги**
- `tsconfig.json` — `"module": "ESNext"`, `"target": "ES2022"`, `"moduleResolution": "Bundler"`, `"strict": true`
- `drizzle.config.ts` — `dialect: 'sqlite'`, schema: `./src/db/schema.ts`, out: `./drizzle`, `dbCredentials.url: './tracker.db'`
- `.gitignore` — `node_modules`, `tracker.db`, `tracker.db-journal`, `drizzle/meta/` можно коммитить

**4. Код по файлам**
- `src/db/schema.ts` — описать `projects` и `tasks` через `sqliteTable(...)` с колонками из раздела «Схема БД»
- `src/db/client.ts` — открыть `better-sqlite3('./tracker.db')`, включить `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`, обернуть в `drizzle(db)`
- `src/lib/id.ts` — `nanoid(12)` как экспорт
- `src/middleware/user.ts` — `c.set('userId', 'me')`
- `src/routes/projects.ts` — 5 хендлеров, валидация тел запросов через Zod
- `src/routes/tasks.ts` — 5 хендлеров + фильтры в GET
- `src/index.ts` — `new Hono().basePath('/api')`, подключить мидлвару и роуты, `serve({ port: 3001 })`
- `src/env.ts` — `PORT = process.env.PORT ?? 3001`, `DB_PATH = './tracker.db'`

**5. Скрипты в package.json**
```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx src/db/migrate.ts",
  "db:studio": "drizzle-kit studio"
}
```
`src/db/migrate.ts` — маленький раннер: читает папку `drizzle/`, вызывает `migrate(db, { migrationsFolder: './drizzle' })`.

**6. Развёртывание БД (одна команда)**
```bash
npm run db:generate   # создаст drizzle/0000_*.sql из схемы
npm run db:migrate    # применит миграции → появится tracker.db
```
Всё. БД — файл `back/tracker.db`. Никаких docker, никаких серверов.

**7. Настройка Vite proxy на фронте**
В [front/vite.config.ts](front/vite.config.ts) добавить:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```
Фронт дёргает `fetch('/api/tasks')` — Vite проксирует на бек. CORS не нужен.

**8. Запуск**
Два терминала:
```bash
# терминал 1
cd back && npm run dev      # http://localhost:3001

# терминал 2
cd front && npm run dev     # http://localhost:5173
```

## Verification (проверка end-to-end)

1. `curl http://localhost:3001/api/health` → `{"ok":true}`
2. `curl -X POST http://localhost:3001/api/projects -H 'Content-Type: application/json' -d '{"name":"Inbox"}'` → вернулся объект с `id`
3. `curl http://localhost:3001/api/projects` → массив с созданным проектом
4. `curl -X POST http://localhost:3001/api/tasks -H 'Content-Type: application/json' -d '{"title":"Тест"}'` → задача создана
5. `curl http://localhost:3001/api/tasks` → массив с задачей
6. `npm run db:studio` → открывается Drizzle Studio в браузере, видно обе таблицы и записи
7. На фронте в devtools сделать `fetch('/api/projects').then(r=>r.json()).then(console.log)` → через Vite proxy вернётся массив (CORS-ошибок быть не должно)
8. Перезапустить бек → данные в `tracker.db` сохранились

## Что дальше (вне scope этого плана)

- Авторизация (Lucia/JWT) → `user_id` начнёт читаться из сессии, а не из константы
- Вложения (`/api/tasks/:id/attachments`) → multer или `@hono/multipart` + папка `uploads/` или S3
- Миграция из localStorage → `POST /api/import` с дампом
- Переезд на VPS → pm2 + nginx, либо `flyctl deploy` с SQLite на volume

## Критичные файлы к изменению/созданию

- **Создать:** [back/](back/) целиком (см. структуру выше)
- **Изменить:** [front/vite.config.ts](front/vite.config.ts) — добавить `server.proxy`
