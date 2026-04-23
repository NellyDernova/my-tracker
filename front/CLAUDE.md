# my-tracker front — инструкция для Claude

## Стек

Vite 8 + React 19 + TS 6 + SCSS Modules. Node 22 (`.nvmrc`) — перед командами `nvm use`.

Пакеты: `react-router-dom` v7, `@tanstack/react-query` v5, `zustand` (+ persist), `@dnd-kit/core` + `sortable`, `dayjs` (+ isoWeek), `idb-keyval`, `@floating-ui/react`, `@fontsource/montserrat`, `clsx`.

Алиас `@/` → `./src` в `vite.config.ts` + `tsconfig.app.json`.

## Команды

```bash
nvm use
npm run dev                # http://localhost:5173, proxy /api → localhost:3005
npm run build              # tsc -b + vite build
npm run lint               # eslint
npx tsc -b                 # быстрая проверка типов
```

## Архитектура

**React Query — единственный источник серверных данных.** Серверные tasks/projects никогда не копируются в Zustand.

**Zustand** — только для UI-state:
- [store/useAppStore.ts](src/store/useAppStore.ts) — `calendarMonth` (persist, ключ `my-tracker-ui`).
- [store/useModalStore.ts](src/store/useModalStore.ts) — `taskStack[]` (стек подзадач), `projectModalTarget`. Не persist.
- [store/useAttachmentsStore.ts](src/store/useAttachmentsStore.ts) — `byTaskId: Record<string, AttachmentMeta[]>`. Persist, ключ `my-tracker-attachments`. Бек про это не знает — чисто локальное хранилище meta. Blob'ы — в IDB через `repository`.

**API-клиент** в [lib/api/](src/lib/api/): `projectsApi`, `tasksApi`, `resetApi`. `ServerTask = Omit<Task, 'attachments'>`. Клиент — обёртка `fetch` с `ApiError`.

**Хуки React Query** в [lib/queries/](src/lib/queries/): `useProjects`, `useTasks`, `useTaskById`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useReorderTasks`, `useToggleTaskStatus`, `useToggleTaskImportant`, `useAttachFile`, `useRemoveAttachment`, `useResetAll` + такие же для projects.

**`useTasks()`** мержит серверные ServerTask с attachments из локального стора — возвращает полный `Task[]`.

**Селекторы** в [lib/queries/selectors.ts](src/lib/queries/selectors.ts): `useInboxTasks`, `useTasksOnDate`, `useProjectTasks`, `useHorizonBuckets`, `useChildTasks` — поверх `useTasks()` + `useMemo`.

## Структура `src/`

```
main.tsx                   # QueryClientProvider + BrowserRouter + createRoot
App.tsx                    # Layout + <Routes> + TaskModal + ProjectModal
pages/                     # InboxPage, HorizonsPage, DaysPage, WeeksPage,
                           # YearsPage, CalendarPage, ProjectPage (kanban), SettingsPage
components/
  Sidebar/                 # useProjects + useReorderProjects для стрелок
  TaskCard/                # Draggable/Static split — см. граблю ниже
  Column/                  # droppable wrapper, отдаёт dropContext
  TaskModal/               # draft-режим (Omit<Task, 'attachments'>), стек подзадач
  ProjectModal/
  DatePicker/DatePickerPopup.tsx
  TagDropdown/             # @floating-ui popover
  Modal/                   # базовый backdrop + Esc
store/                     # useAppStore, useModalStore, useAttachmentsStore — UI-only
lib/
  api/                     # ApiError + fetch-обёртки + projectsApi/tasksApi/resetApi
  queries/                 # keys, projects, tasks, reset, selectors — все RQ-хуки
  repository/              # LocalRepository — ТОЛЬКО для IDB-blobs attachments
  domain/                  # recurrence (taskOccursOn), horizons (bucketize), sorting
  hooks/useDragScroll.ts   # горизонтальный drag для Horizons
  hooks/useClickOutside.ts
  dates.ts                 # dayjs-обёртки: ymd, parseYmd, startOfWeek, isoWeekNum, ...
  dnd.ts                   # useBoardSensors + handleBoardDragEnd(e, updateFn)
  utils.ts                 # uid, formatSize
types/index.ts             # Task, Project, Status, DateType, RepeatKind, AttachmentMeta
constants/                 # statuses (с эмодзи), emojis, repeat
styles/global.scss         # CSS-переменные + reset + .btn + .view-title
```

## Ключевые паттерны

**Оптимистичные мутации.** Каждая — `onMutate` патчит кеш, `onError` откатывает из ctx.prev, `onSettled` инвалидирует. Для create — временный id `temp:<uid>`, в `onSuccess` заменяется серверным.

**Модальный стек подзадач.** `useModalStore.taskStack: string[]` — верх рендерится в `TaskModal`. `openTask(id)` ресетит, `openChildTask(id)` пушит, `goBackToParent()` попит. **Draft** в TaskModal — локальный `useState<Omit<Task, 'attachments'>>`. `flush()` → `useUpdateTask.mutate({id, patch})` при смене activeId / добавлении подзадачи / закрытии. `createTask.mutateAsync()` нужен для подзадач (ждём серверный id перед пушем в стек).

**Attachments.** `useAttachFile(taskId, file)` → `repository.saveAttachment` (IDB blob) → `attachmentsStore.addAttachment` (meta). В TaskModal меta читается напрямую из стора (реактивно), не из draft. При `useDeleteTask` поддерево собирается из RQ-кеша; IDB-blob'ы чистятся в `onSuccess` (не в `onMutate` — чтобы при ошибке не потерять файлы).

**DnD.** `<DndContext sensors={useBoardSensors()} onDragEnd={(e) => handleBoardDragEnd(e, (id, patch) => updateTask.mutate({id, patch}))}>`. `useBoardSensors()` задаёт `PointerSensor` с `activationConstraint: { distance: 5 }` — чтобы клик не съедался drag-ом. `Column` даёт `dropContext` в droppable data. `TaskCard` в Draggable-режиме применяет `transform` из `useDraggable` к `style` (иначе карточка не двигается визуально).

**Bucketing.** `bucketizeTasks(tasks)` распределяет по 6 ведёркам (today/tomorrow/week/month/year/life). Рекурренция через `taskOccursOn()` — повторяющиеся попадают в today/tomorrow.

## Грабли (уже напоролся — не повторять)

**1. Infinite loop от нестабильных селекторов Zustand.** `useStore((s) => s.foo[id] ?? [])` каждый раз создаёт новый `[]` → `useSyncExternalStore` крутит цикл. Решение: модуль-левел константа `const EMPTY_ATTACHMENTS: AttachmentMeta[] = []`, возвращать её.

**2. Infinite loop от `data = []` в React Query.** `const { data = [] } = useQuery()` — новый `[]` на каждый рендер, ломает `useMemo([data])`. Решение: `const { data } = ...; const list = data ?? EMPTY_CONST`.

**3. Infinite loop от `useEffect` с нестабильными deps.** Если зависишь от `storeTask`/`mutation` (объект React Query), они меняют ссылку каждый рендер. Решение: `useRef` для актуальных значений + `deps: [taskId]` (только примитивы). См. `useDraftSync` в [TaskModal.tsx](src/components/TaskModal/TaskModal.tsx).

**4. dnd-kit без `activationConstraint` ломает клики.** Любой `pointerdown` засчитывается как начало drag → click съедается. В [lib/dnd.ts](src/lib/dnd.ts) — `PointerSensor` с `distance: 5`.

**5. dnd-kit без `transform` в style — нет визуального движения.** `useDraggable` возвращает `transform: {x,y}`, его надо применить вручную: `style={transform ? { transform: translate3d(...) } : undefined}`. См. [TaskCard.tsx](src/components/TaskCard/TaskCard.tsx).

**6. dnd-kit + `disabled: true`.** Ставит `aria-disabled="true"` — ломает клики. Решение: split `DraggableTaskCard` / `StaticTaskCard`, хук вызывается только когда нужен drag.

**7. SCSS + CSS пакетов.** `@use '@fontsource/...css'` не работает (dart-sass). CSS-импорты шрифтов — в `main.tsx`.

**8. TS 7.0 `baseUrl` deprecated.** В tsconfig только `paths`, без `baseUrl`.

## Стиль кода

- SCSS Modules per component: `Component.module.scss` + `Component.tsx` в одной папке.
- CSS-переменные из `:root` в `global.scss` — `--accent`, `--surface`, `--border-soft`, …
- Utility-классы: `.btn .btn-primary/-ghost/-danger`, `.view-title`, `.view-subtitle`, `.hint`.
- Имена классов в модулях — camelCase.
- Эмодзи в nav/табах/кнопках — inline в JSX.
