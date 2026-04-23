# My Tracker — инструкция

Менеджер задач с горизонтами планирования. Две кодобазы:
- `front/` — актуальная React-версия (разрабатывается)
- `index.html` + `app.js` + `styles.css` в корне — старая ваниль, **референс** (не трогать, удалить после финала)

Плагин миграции: [~/.claude/plans/peppy-plotting-fairy.md](../../.claude/plans/peppy-plotting-fairy.md) + копия [tmp/plans/peppy-plotting-fairy.md](tmp/plans/peppy-plotting-fairy.md).

## Стек (front/)

Vite 8 + React 19 + TS 6 + SCSS Modules. **Требует Node 22** (см. `.nvmrc`). Перед командами: `nvm use`.

Пакеты: `react-router-dom` v7, `zustand` + persist, `@dnd-kit/core` + `sortable`, `dayjs` (+ isoWeek), `idb-keyval`, `@floating-ui/react`, `@fontsource/montserrat`, `clsx`.

Алиас `@/` → `./src` в `vite.config.ts` + `tsconfig.app.json`.

## Команды

```
cd front && nvm use        # обязательно перед любой командой
npm run dev                # http://localhost:5173
npm run build              # tsc -b + vite build
npm run lint               # eslint
npx tsc -b                 # быстрая проверка типов
```

Vite proxy: `/api` → `localhost:3001` (бэка пока нет, на будущее).

## Структура `front/src/`

```
main.tsx                   # preflight legacy→v2 миграция, потом createRoot
App.tsx                    # Layout + <Routes> + TaskModal + ProjectModal
pages/                     # по папке на экран, каждая + .module.scss
  InboxPage, HorizonsPage, DaysPage, WeeksPage, YearsPage,
  CalendarPage, ProjectPage (kanban), SettingsPage
components/
  Sidebar/                 # nav + projects list (Zustand)
  TaskCard/                # Draggable/Static split — см. граблю ниже
  Column/                  # droppable wrapper для dnd-kit
  TaskModal/               # TaskModal.tsx + AttachmentLink.tsx, draft-режим
  ProjectModal/
  DatePicker/DatePickerPopup.tsx  # 5 табов: День/Неделя/Месяц/Год/Жизнь
  TagDropdown/             # @floating-ui popover
  Modal/                   # базовый backdrop + Esc
store/
  useAppStore.ts           # projects/tasks/calendarMonth + все actions + persist
  useModalStore.ts         # taskStack[], projectModalTarget — стек подзадач
  selectors.ts             # useInboxTasks, useTasksOnDate, useHorizonBuckets, ...
lib/
  repository/              # Repository интерфейс + LocalRepository + migrations
  domain/                  # recurrence (taskOccursOn), horizons (bucketize), sorting
  hooks/useDragScroll.ts   # горизонтальный drag для Horizons
  hooks/useClickOutside.ts
  dates.ts                 # dayjs-обёртки: ymd, parseYmd, startOfWeek, isoWeekNum, ...
  dnd.ts                   # handleBoardDragEnd — общий для всех колонок
  utils.ts                 # uid, formatSize
types/index.ts             # Task, Project, Status, DateType, RepeatKind, AttachmentMeta
constants/                 # statuses (с эмодзи), emojis (PROJECT_EMOJIS), repeat
styles/global.scss         # CSS-переменные + reset + .btn + .view-title
```

## Ключевые концепции

**Repository-паттерн.** Доступ к persist через `src/lib/repository/`. `LocalRepository` сейчас, `ApiRepository` потом. Attachments: меta в сторе, blob в IDB под ключом `attachment:<uuid>`.

**localStorage.** Ключ `my-tracker-v1` (совместимость с ваниллой). Формат после Zustand persist: `{state: {...}, version: 2}`. Ваниль хранила голый state без обёртки — `main.tsx` делает preflight: читает, если legacy — прогоняет `migrateLegacy` + переливает dataUrl→IDB, пишет обратно в v2.

**Модальный стек подзадач.** `useModalStore.taskStack: string[]` — верх стека рендерится в `TaskModal`. `openTask(id)` ресетит, `openChildTask(id)` пушит, `goBackToParent()` попит. Draft — локальный state в TaskModal, `flush()` пишет в стор при: смене activeId / добавлении подзадачи / закрытии.

**DnD.** `<DndContext onDragEnd={handleBoardDragEnd}>` на странице. Колонка даёт `dropContext` в droppable data. Карточка — `useDraggable` с `taskId`. `handleBoardDragEnd` дёргает `updateTask(taskId, patch)` из `dropContext`.

**Horizons bucketing.** `bucketizeTasks(tasks)` из `lib/domain/horizons.ts` распределяет по 6 ведёрок (today/tomorrow/week/month/year/life). Учитывает рекурренцию — `taskOccursOn()` добавляет повторяющиеся задачи в today/tomorrow.

## Грабли (уже напоролся — не повторять)

**1. Zustand infinite loop.** Селектор, возвращающий новый объект/массив → бесконечный рендер. Либо сплющивай в примитивы, либо тяни raw-массив из стора и считай через `useMemo`. Пример в [TaskCard.tsx:71](front/src/components/TaskCard/TaskCard.tsx#L71) — children через `useMemo(allTasks.filter ...)`, а НЕ прямо в селекторе.

**2. dnd-kit + `disabled: true` = `aria-disabled`.** Если `draggable={false}`, `useDraggable({disabled: true})` всё равно ставит `aria-disabled="true"` и ломает клики. Решение в [TaskCard.tsx](front/src/components/TaskCard/TaskCard.tsx) — split на `DraggableTaskCard` / `StaticTaskCard`, внутренности делят `TaskCardContent`. Хук вызывается ТОЛЬКО когда нужен drag.

**3. SCSS + CSS пакетов.** `@use '@fontsource/...css'` в scss не работает (dart-sass). CSS-импорты шрифтов — в `main.tsx`, НЕ в `global.scss`.

**4. TS 7.0 deprecation.** `baseUrl` в tsconfig deprecated → убрал, оставил только `paths` (работает относительно tsconfig без baseUrl).

**5. Zustand persist требует формат `{state, version}`.** Для совместимости со старой ваниллой preflight в main.tsx сначала конвертит голый snapshot в обёртку, потом Zustand читает.

## Ванильный код — где что искать

Когда нужно портировать логику, смотри в корне проекта:
- [app.js](app.js) 1393 строки, разбит `// ===== Section =====` комментариями
- [index.html](index.html) — DOM модалок (строки 39-171), готовая спецификация для JSX
- [styles.css](styles.css) 853 строки, разделы по функциональности

Ключевые зоны app.js: `loadState/миграция` (1-50), `taskOccursOn` (103-121), `horizonBucket` (209-240), `drag handlers` (581-639), `attachDragScroll` (642-668), `TaskModal + стек` (670-780), `DatePicker` (889-1126).

## Стиль кода

- SCSS Modules per component: `Component.module.scss` + `Component.tsx` в одной папке
- CSS-переменные из `:root` в `global.scss` — `--accent`, `--surface`, `--border-soft`, ...
- Utility-классы: `.btn .btn-primary/-ghost/-danger`, `.view-title`, `.view-subtitle`, `.hint`
- Имена классов в модулях — camelCase (SCSS compiled → работает)
- Все эмодзи в nav/табах/кнопках — inline в JSX (совпадает с ваниллой)
