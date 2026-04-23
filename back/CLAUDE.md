# my-tracker back — инструкция для Claude

## Стек

- Node.js + TypeScript (ESM, `"type": "module"`)
- Запуск через `tsx` без сборки
- Hono + `@hono/node-server` (порт из `src/env.ts`, сейчас 3005)
- SQLite через `better-sqlite3` (**синхронный** драйвер — никаких `await` на `.all()/.get()/.run()`)
- Drizzle ORM + `drizzle-kit` (dialect: `'sqlite'`)
- Zod + `@hono/zod-validator` для валидации запросов

## Структура

```
back/
  src/
    db/
      schema.ts          Drizzle-таблицы + type exports ($inferSelect/$inferInsert)
      client.ts          Database() → drizzle(), WAL + foreign_keys=ON
      migrate.ts         runtime-раннер миграций
    routes/<entity>.ts   Hono sub-router со всеми CRUD
    middleware/user.ts   ставит c.set('userId', ...)
    lib/id.ts            newId() = nanoid(12)
    env.ts               PORT, DB_PATH, DEFAULT_USER_ID
    index.ts             главный app, logger, монтирует роуты под /api
  drizzle/               SQL-миграции (коммитим)
  tracker.db             SQLite, в .gitignore
  drizzle.config.ts
  tsconfig.json
```

## Правила кода

**Импорты ESM с `.js`-расширением:**
```ts
import { db } from '../db/client.js'; // НЕ .ts, НЕ без расширения
```

**Именование:**
- БД: `snake_case` колонки (`user_id`, `created_at`)
- TS: `camelCase` в схеме (`userId: text('user_id')`)
- API: `camelCase` в JSON (идёт из Drizzle как есть)

**Мультиюзер:**
- каждый запрос тянет `userId = c.get('userId')` из `userMiddleware`
- все запросы в БД всегда фильтруют по `userId` (`and(eq(table.id, id), eq(table.userId, userId))`)
- новые таблицы обязаны иметь колонку `user_id` с индексом и `default('me')`
- когда добавим auth — меняется только `middleware/user.ts`, роуты не трогаем

**Валидация:**
- каждый `POST/PATCH` → `zValidator('json', schema)`, тело читаем через `c.req.valid('json')`
- каждый `GET` с фильтрами → `zValidator('query', schema)`
- Zod-ошибки уходят 400 автоматически

**Ошибки:**
- не найдено → `c.json({ error: 'not_found' }, 404)`
- `DELETE`: если `result.changes === 0` → 404, иначе `c.body(null, 204)`
- общий обработчик в `index.ts` (`app.onError`) ловит неожиданное

**Роуты:**
- один файл на сущность: `export const xxxRoutes = new Hono<{ Variables: AppVariables }>().get(...).post(...)...`
- чейнинг — сохраняет типы RPC, не разбивать на отдельные вызовы
- монтировать в `index.ts`: `app.route('/api/xxx', xxxRoutes)`

**Drizzle-моменты:**
- возвращать объект после insert/update: `.returning().all()` → `const [row] = ...`
- `.all()` — массив, `.get()` — одна запись или `undefined`, `.run()` — для `DELETE` (даёт `{ changes }`)
- транзакция: `db.transaction((tx) => { tx.update(...).run(); })` — не `const t = db.transaction(...); t();`
- boolean → `integer('col', { mode: 'boolean' })`
- JSON-массив → `text('col', { mode: 'json' }).$type<string[]>()`
- timestamps храним как `integer` (ms) через `$defaultFn(() => Date.now())` — проще для JSON
- `order` — зарезервированное слово, используем `position`

## Команды

```bash
npm run dev            # tsx watch, перезапуск на изменения
npm run db:generate    # после правки schema.ts → создаёт drizzle/NNNN_*.sql
npm run db:migrate     # применяет миграции (создаёт/обновляет tracker.db)
npm run db:studio      # GUI для БД в браузере
npx tsc --noEmit       # typecheck без билда
```

**Поток добавления таблицы/поля:**
1. правим `src/db/schema.ts`
2. `npm run db:generate` → смотрим SQL в `drizzle/`
3. `npm run db:migrate`
4. обновляем/создаём роуты + Zod-схемы

## Что НЕ делать

- не городить service/repository-слои — роут дёргает `db` напрямую, это нормально для такого размера
- не делать `await` на Drizzle-вызовах (sync драйвер, TS не ругается, но выглядит неверно)
- не писать CORS — фронт ходит через Vite proxy `/api`
- не добавлять auth/JWT/users таблицу пока явно не попросят — сейчас DEFAULT_USER_ID='me'
- не трогать уже применённые миграции в `drizzle/` — только новые файлы
