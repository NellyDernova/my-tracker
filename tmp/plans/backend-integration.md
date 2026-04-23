# План интеграции бек ↔ фронт

**Цель.** Фронт перестаёт хранить данные в localStorage, ходит за ними в бек (`http://localhost:3005/api/*` через Vite proxy). Онлайн-only. Начинаем с чистой БД. Один юзер (хардкод `me`).

## Ключевые решения (согласованы)

1. **Схема.** Подтягиваем бек под фронт (фронт не ломаем, бек ещё ничего не содержит — БД сносим).
2. **Attachments.** Оставляем как есть — чисто в IDB на фронте, в бек не едут.
3. **Режим.** Онлайн-only: каждое действие → fetch. Нет бека → не работает.
4. **Данные.** С чистого листа (preflight-миграцию удалить).
5. **Стейт.** Zustand остаётся только для UI-state (`calendarMonth`, модалки, стек подзадач). Серверные данные — React Query.
6. **UX.** Оптимистичные апдейты везде.
7. **Order.** Добавляем `position` в Project и Task + эндпоинт для реордера задач.
8. **`calendarMonth`.** Zustand с persist (только этот ключ + стек).
9. **Auth.** Пока нет, `DEFAULT_USER_ID = 'me'`.

---

## Этап 1. Бек — унификация схемы

**Файлы:** `back/src/db/schema.ts`, `back/src/routes/projects.ts`, `back/src/routes/tasks.ts`

### 1.1. `schema.ts` — привести к фронту

**projects:**
- Убрать `color`.
- Добавить `description: text('description').notNull().default('')`.
- Добавить `emoji: text('emoji').notNull().default('📁')`.
- `position` оставить.

**tasks:**
- `status`: текст без ограничений — значение `'in-progress'` (с дефисом, как на фронте).
- `dateType`: добавить в документации/валидации `'life'`.
- `repeat`: новые значения — `none | daily | weekdays | weekly | custom-weekdays | monthly | yearly`.
- `repeatDays`: поменять `.$type<string[]>()` → `.$type<number[]>()` (Weekday 0..6).
- Добавить `position: integer('position').notNull().default(0)` + индекс по `(userId, projectId, parentId)` — понадобится для kanban-реордера.

### 1.2. Снос старой БД и новая миграция

```bash
cd back
rm tracker.db tracker.db-shm tracker.db-wal
rm drizzle/0000_wooden_overlord.sql drizzle/meta/*.json
npm run db:generate   # создаст новую 0000_*.sql
npm run db:migrate    # создаст свежую tracker.db
```

(Правило бека — «не трогать уже применённые миграции» — не нарушаем: БД сносим вместе со state'ом миграций, считается новым началом.)

### 1.3. Роуты и Zod-схемы

**`routes/projects.ts`:**
- `createSchema`: убрать `color`, добавить `description: z.string().default('')`, `emoji: z.string().default('📁')`.
- `updateSchema`: то же + nullable там, где надо.

**`routes/tasks.ts`:**
- `dateTypeEnum = z.enum(['none','day','week','month','year','life'])`.
- `statusEnum = z.enum(['todo','in-progress','done'])`.
- `repeatEnum = z.enum(['none','daily','weekdays','weekly','custom-weekdays','monthly','yearly'])`.
- `repeatDays: z.array(z.number().int().min(0).max(6)).optional()`.
- Добавить `position` в create/update.
- Новый эндпоинт `POST /api/tasks/reorder`:
  ```ts
  body: { ids: string[] }  // упорядоченный список id в пределах одной группы
  ```
  в транзакции прописывает `position = idx` для каждого id, возвращает обновлённые строки.

### 1.4. Проверка

- `cd back && npx tsc --noEmit` — без ошибок.
- `npm run dev` — стартует без крэша.
- `curl http://localhost:3005/api/health` → `{ok: true}`.
- `curl -X POST http://localhost:3005/api/projects -H 'Content-Type: application/json' -d '{"name":"Тест","emoji":"🔥"}'` → 201.

---

## Этап 2. Фронт — типы и API-клиент

**Файлы:** `front/src/types/index.ts`, новая папка `front/src/lib/api/`

### 2.1. Типы

Добавить `position: number` в `Project` и `Task`. Сортировки, которые сейчас по `createdAt`, вторичным ключом останутся, первичным — `position`.

### 2.2. API-клиент (без лишних либ, на `fetch`)

```
front/src/lib/api/
  client.ts       // базовый fetch-обёртчик (обработка 4xx/5xx, JSON)
  projects.ts     // list/create/update/delete/reorder
  tasks.ts        // list/get/create/update/delete/reorder
  index.ts
```

Пример сигнатур:
```ts
listProjects(): Promise<Project[]>
createProject(input: {name: string; description?: string; emoji?: string}): Promise<Project>
updateProject(id: string, patch: Partial<Project>): Promise<Project>
deleteProject(id: string): Promise<void>
reorderProjects(ids: string[]): Promise<Project[]>
// аналогично tasks + reorderTasks(ids: string[])
```

### 2.3. Проверка

- `cd front && npx tsc -b` — без ошибок.
- Ручной вызов из devtools: `import('/src/lib/api').then(m => m.listProjects())` отвечает массивом.

---

## Этап 3. React Query + хуки

**Файлы:** `front/package.json`, `front/src/App.tsx`, новая `front/src/lib/queries/`

### 3.1. Установить

```bash
cd front && npm i @tanstack/react-query
```

### 3.2. Обернуть App

В `main.tsx`: `QueryClientProvider` вокруг `<App />`. Дефолты клиента: `staleTime: Infinity` (инвалидация ручная в мутациях), `retry: 1`, `refetchOnWindowFocus: false`.

### 3.3. Хуки

```
front/src/lib/queries/
  projects.ts     // useProjects, useCreateProject, useUpdateProject, useDeleteProject, useReorderProjects
  tasks.ts        // useTasks, useCreateTask, useUpdateTask, useDeleteTask, useReorderTasks
  keys.ts         // query keys factory
```

**Оптимистичность.** Каждый `useMutation` реализует `onMutate` (обновление кеша) / `onError` (откат) / `onSettled` (инвалидация). Особенно важно для `toggleStatus`, `toggleImportant`, `updateTask` — там по DnD частые апдейты, ожидание бека — колхоз.

**Селекторы.** `useQuery` может принимать `select` — там, где фронт раньше делал `useInboxTasks`, `useTasksOnDate`, `useHorizonBuckets`, переписываем:

```ts
export function useInboxTasks() {
  return useTasks({
    select: (tasks) => tasks.filter(t => !t.parentId && !t.projectId && t.dateType === 'none').sort(taskSorter),
  })
}
```

(либо тянем через `useTasks()` и `useMemo` в вызывающем компоненте — как сейчас сделано с Zustand. Пойду через `select` — канонично для RQ.)

---

## Этап 4. Рефактор стора

**Файл:** `front/src/store/useAppStore.ts`, `front/src/store/selectors.ts`

### 4.1. Урезать `useAppStore`

Остаются только:
- `calendarMonth: string | null`
- `setCalendarMonth`
- (опционально) флаги UI

Убираем: `projects`, `tasks`, `addTask`, `updateTask`, `deleteTask`, `toggleStatus`, `toggleImportant`, `addProject`, `updateProject`, `deleteProject`, `moveProject`, `attachFile`, `removeAttachment`, `replaceAll`, `reset`. Аналоги — в хуках React Query (attachFile/removeAttachment — остаются, но работают напрямую с IDB через `repository`, без стора: вызываются после фактического `useUpdateTask` с patch'ем `attachments`).

Persist — остаётся, но `partialize` оставляет только `{ calendarMonth }`.

### 4.2. `selectors.ts`

Удалить (его содержимое переезжает в `lib/queries/tasks.ts` как `select`-селекторы).

### 4.3. Attachments

`attachFile(taskId, file)`:
1. `repository.saveAttachment(taskId, file)` → `meta`.
2. `updateTaskMutation.mutate({id: taskId, attachments: [...prev, meta]})`.

`attachments` храним на фронте **прямо в кеше React Query**, но бек их не знает. То есть это поле в `Task` будет чисто фронтовое — бек не вернёт его в GET. Два варианта:
- **a)** На фронте после `listTasks` делаем обогащение: подтягиваем attachments из IDB по ключу `task:<id>:attachments` и мержим.
- **b)** Храним attachments в отдельном локальном Zustand-сторе (map taskId → AttachmentMeta[]), persist в localStorage.

**Выбор: (b)** — проще, нет гонок с React Query, меньше кода. Добавлю маленький `useAttachmentsStore` с persist.

**Уточняющий вопрос Владосу:** Ок такой подход по attachments, или тебе принципиально их мигрировать в БД позже? (сейчас остаются как есть — IDB + локальный Zustand для meta).

---

## Этап 5. Переписать компоненты

Пройти по всем местам, где `useAppStore` или `selectors` используются, и заменить на новые хуки. По шагам:

1. **Sidebar** — `useProjects`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`, `useReorderProjects` (вместо `moveProject` — dnd-sortable отдаёт массив ids, дёргаем reorder).
2. **InboxPage / DaysPage / WeeksPage / YearsPage / HorizonsPage / CalendarPage / ProjectPage** — `useTasks` с `select`.
3. **TaskCard** — children через отдельный `useTasks({select: tasks => tasks.filter(t => t.parentId === id)})` (либо общий `useTasks` + `useMemo`).
4. **TaskModal** — `useTaskById`, `useUpdateTask`, `useCreateTask`, `useDeleteTask`. Draft-режим остаётся (локальный state + `flush()` → `updateTaskMutation`).
5. **ProjectModal** — `useCreateProject`/`useUpdateProject`/`useDeleteProject`.
6. **`lib/dnd.ts` / `handleBoardDragEnd`** — вместо `dropContext.updateTask` передаём мутацию из хука (подключается в странице).

---

## Этап 6. Уборка

- `front/src/main.tsx`: удалить `preflightMigration`, `dataUrlToBlob`, `bootstrap` — просто `createRoot`.
- `front/src/lib/repository/migrations.ts`: удалить.
- `front/src/lib/repository/`: оставить `LocalRepository`, но интерфейс `Repository` урезать до attachment-only (убрать `loadState`/`saveState`). `PERSIST_KEY` убрать (или оставить если Zustand persist его использует для `calendarMonth` — тогда оставить).
- Обновить `front/CLAUDE.md` (структура изменилась).
- Обновить корневой `CLAUDE.md` (добавить упоминание бека).

---

## Этап 7. Запуск и ручная проверка

1. Два терминала: `cd back && npm run dev` и `cd front && nvm use && npm run dev`.
2. Открыть http://localhost:5173.
3. Создать проект → появляется в Sidebar.
4. Создать задачу в Inbox → в БД есть, по F5 — остаётся.
5. Drag задачи в колонку "Сегодня" → меняется dateType+date, фронт не ждёт бек (оптимистично).
6. Переключение статуса, important.
7. Удаление задачи с подзадачами — удаляется поддерево (FK cascade в БД).
8. Attachments — прикрепить файл, перезагрузить страницу, файл на месте.
9. Проверить что localStorage больше не содержит `my-tracker-v1.state.tasks/projects` (только `calendarMonth`).
10. Остановить бек → UI показывает ошибки на действиях (ок для онлайн-only; можно добавить тост позже).

---

## Порядок работы

Идём этапами 1→7 последовательно. После каждого этапа:
- type-check (`npx tsc` на соответствующей стороне);
- мой короткий отчёт что сделано;
- твоё "ок" → следующий этап.

Если по ходу всплывёт что-то непредвиденное — останавливаюсь, спрашиваю.

## Риски / гребли

- **Zustand infinite loop** (из CLAUDE.md): при переходе на RQ `select` возвращает новые ссылки → тот же риск. Решение: стабильный `select` (не инлайн в компоненте, а модуль-level функция) + `structuralSharing` у RQ (по умолчанию включён).
- **TaskModal draft-режим.** Draft сейчас сохраняется при смене activeId/добавлении подзадачи/закрытии. С мутацией — надо осторожно: `flush()` должен триггерить один `updateTask`, а не серию.
- **Порядок создания подзадачи.** Сейчас `addTask` создаёт сразу, возвращает объект, фронт пушит в модальный стек. С сервером — `createTask` асинхронный; стек можно пушить оптимистично сразу (временный id → потом заменить на серверный) или ждать ответа (проще, но лаг). Идём на «ждать ответ» — это быстро (< 50мс локально).
- **Каскадное удаление на фронте.** Сейчас `deleteTask` через `collectDescendants` проходит всё поддерево, чтобы удалить IDB-attachments. После миграции бек сам каскадит задачи через FK, но фронту всё равно надо знать, какие задачи удалились, чтобы подчистить attachments в IDB. Решение: перед DELETE собираем id поддерева из локального кеша RQ, после успеха — удаляем attachments по собранному списку.
