# My Tracker — инструкция

Менеджер задач с горизонтами планирования. Две кодобазы, интегрированы:
- `front/` — React + Vite, ходит в бек через `/api` (Vite proxy)
- `back/` — Hono + SQLite (Drizzle), порт 3005, источник правды по данным

Отдельные инструкции: [front/CLAUDE.md](front/CLAUDE.md), [back/CLAUDE.md](back/CLAUDE.md).

## Запуск

Обязательно Node 22 (`nvm use` в обоих подпроектах).

```bash
./start.sh                                 # поднимает back (3005) + front (5173), открывает браузер
# или по отдельности:
cd back  && nvm use && npm run dev
cd front && nvm use && npm run dev
```

Проверка здоровья: `curl http://localhost:3005/api/health`.

## Архитектура

**Онлайн-only.** Фронт без бека не работает — каждое действие = fetch. Оптимистичные апдейты, откат при ошибке.

**Данные:** бек (SQLite `back/tracker.db`). Фронт держит серверные данные в React Query-кеше.

**Локально на фронте хранится только:**
- `calendarMonth` (UI-state какой месяц открыт) — Zustand persist, ключ `my-tracker-ui`.
- `AttachmentMeta[]` по `taskId` — Zustand persist, ключ `my-tracker-attachments`.
- Blob'ы файлов — IDB (`idb-keyval`), ключи `attachment:<uuid>`. Бек про attachments ничего не знает.

**Auth:** нет. `DEFAULT_USER_ID = 'me'` на беке, все запросы фильтруются по `userId`.

## Модель данных

Единый источник типов — [front/src/types/index.ts](front/src/types/index.ts). Схема бека ([back/src/db/schema.ts](back/src/db/schema.ts)) подтянута под неё.

- `Task`: `dateType: 'none'|'day'|'week'|'month'|'year'|'life'`, `status: 'todo'|'in-progress'|'done'` (**с дефисом**), `repeat: 'none'|'daily'|'weekdays'|'weekly'|'custom-weekdays'|'monthly'|'yearly'`, `repeatDays: number[]` (0-6), `position: number`, `parentId: string | null` (подзадачи, FK cascade).
- `Project`: `name`, `description`, `emoji`, `position`.
- Оба имеют `position` для упорядочения (эндпоинты `/reorder`).
