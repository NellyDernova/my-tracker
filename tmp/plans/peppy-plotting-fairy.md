# План миграции My Tracker: ваниль → React

## Context

В корне проекта `/Users/vladstanulevic/Desktop/my-tracker/` лежит полноценный офлайн-трекер задач на ванильном JS/CSS:
- `app.js` — 1393 строки (весь стейт, рендер, обработчики в одном файле);
- `styles.css` — 853 строки (CSS-переменные, без методологии);
- `index.html` — DOM-скелет и модалки;
- `back/` — пусто, бэкенда нет, данные в `localStorage['my-tracker-v1']`.

Приложение содержит 8 экранов (Horizons / Days / Weeks / Years / Calendar / Inbox / Project-Kanban / Settings), систему горизонтов планирования, рекуррентные задачи, иерархию подзадач с модальным стеком, собственный date picker, drag&drop, прикрепление файлов (dataURL в localStorage).

В `/Users/vladstanulevic/Desktop/my-tracker/front/` подготовлен чистый скаффолд Vite 8 + React 19 + TS 6 — больше ничего не установлено. Нужно добавить зависимости, структуру, и последовательно перенести функциональность.

**Цель**: собрать в `front/` работающий React-эквивалент ванильной версии с сохранением данных пользователя (тот же `localStorage['my-tracker-v1']`). Архитектура должна позволять в будущем подменить localStorage на бэкенд-API без переписывания UI.

## Архитектурные решения (утверждены)

| Аспект | Решение |
|---|---|
| Роутер | `react-router-dom` v7 (URL для каждого экрана) |
| Стейт-менеджер | Zustand + persist middleware, ключ `'my-tracker-v1'` |
| Стили | SCSS Modules (пакет `sass`) |
| Drag&Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Даты | dayjs (с `isoWeek` и `locale('ru')`) |
| Файлы-вложения | IndexedDB через `idb-keyval` (только blob), метаданные в сторе |
| Старый код | Остаётся в корне до финальной верификации |
| Persist | Абстрагирован через `Repository`-паттерн — готовность к API |

## Пакеты

```bash
# из папки front/
npm install react-router-dom zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities dayjs idb-keyval @floating-ui/react @fontsource/montserrat clsx
npm install -D sass
```

## Структура `front/src/`

```
src/
├── main.tsx                          # BrowserRouter + preflight миграция
├── App.tsx                           # Layout (Sidebar + <Outlet/>) + <Routes>
├── App.module.scss
├── pages/
│   ├── InboxPage/
│   ├── HorizonsPage/
│   ├── DaysPage/
│   ├── WeeksPage/
│   ├── YearsPage/
│   ├── CalendarPage/
│   ├── ProjectPage/
│   └── SettingsPage/
├── components/
│   ├── Sidebar/
│   ├── TaskCard/
│   ├── Column/
│   ├── TaskModal/                    # + SubtasksList, AttachmentsList, WeekdaysPicker
│   ├── ProjectModal/
│   ├── DatePicker/                   # Popup + MonthCalendar + MonthsGrid + YearsGrid
│   ├── TagDropdown/
│   ├── Modal/                        # базовый backdrop, focus trap, Escape
│   └── ui/                           # Badge, IconButton, EmojiButton
├── store/
│   ├── useAppStore.ts                # projects / tasks / calendarMonth + persist
│   ├── useModalStore.ts              # taskStack, projectModalId
│   └── selectors.ts                  # useInboxTasks, useHorizonBuckets, useTasksOnDate, useProjectTasks
├── lib/
│   ├── repository/
│   │   ├── Repository.ts             # интерфейс
│   │   ├── LocalRepository.ts        # localStorage + idb-keyval
│   │   ├── migrations.ts             # миграция из ванильного формата
│   │   └── index.ts                  # singleton
│   ├── dates.ts                      # dayjs-обёртки
│   ├── domain/
│   │   ├── recurrence.ts             # taskOccursOn
│   │   ├── horizons.ts               # horizonBucket, bucketizeTasks
│   │   └── sorting.ts                # taskSorter
│   └── hooks/
│       ├── useDragScroll.ts          # горизонтальный drag-scroll
│       └── useClickOutside.ts
├── types/index.ts                    # Task, Project, Status, DateType, RepeatKind
├── constants/                        # statuses, emojis, repeat-варианты
└── styles/
    ├── global.scss                   # CSS-переменные + reset + font-face
    └── mixins.scss
```

Алиас `@/` → `./src` настроить в `vite.config.ts` и `tsconfig.app.json`.

## Repository-паттерн

Слой доступа к данным изолирован интерфейсом, UI ходит через Zustand (который использует репозиторий внутри persist-хранилища + прямыми вызовами для attachments).

```ts
// src/lib/repository/Repository.ts
export interface Repository {
  loadState(): Promise<AppStateSnapshot>;
  saveState(state: AppStateSnapshot): Promise<void>;
  saveAttachment(taskId: string, file: File): Promise<AttachmentMeta>;
  loadAttachmentBlob(id: string): Promise<Blob | null>;
  deleteAttachment(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

`LocalRepository` — localStorage + `idb-keyval` под ключами `attachment:<uuid>`.
В будущем появится `ApiRepository` с тем же контрактом — UI не меняется.

## Совместимость с `'my-tracker-v1'`

Два уровня:
1. **Тот же ключ** — `name: 'my-tracker-v1'` в persist.
2. **Функция миграции** (`src/lib/repository/migrations.ts`) — приводит ванильный формат к новому:
   - раскладывает `_legacySubtasks` → отдельные задачи с `parentId` (ваниль уже делает это в [app.js:10-39](app.js#L10-L39) — портируем);
   - нормализует поля: `horizon → dateType`, defaults для `important`, `repeatDays`, `attachments`;
   - вытаскивает `attachment.dataUrl` → декодирует в Blob → пишет в IDB → из метаданных удаляет.

Поскольку ванильный формат — голый snapshot без обёртки `{state, version}`, которую ждёт Zustand persist, в `main.tsx` делается **preflight**: читаем `localStorage['my-tracker-v1']`, если формат ванильный — пропускаем через `migrateLegacy`, записываем обратно в Zustand-формате, **только потом** рендерим приложение.

## Этапы реализации

Все этапы — в `front/`. Проверка после каждого: `npm run dev` + визуальная проверка сценариев из раздела «Верификация».

1. **Чистка скаффолда**: удалить демо-файлы (`App.css`, `index.css`, SVG-логотипы, демо-счётчик в `App.tsx`).
2. **Установка пакетов + алиас `@/`** в vite.config.ts / tsconfig.
3. **Роутер-каркас**: `BrowserRouter` в main.tsx, layout `App.tsx` (Sidebar + `<Outlet/>`), все 8 роутов на страницы-заглушки.
4. **Глобальные стили**: `global.scss` с CSS-переменными из [styles.css:1-19](styles.css#L1-L19), Montserrat через `@fontsource/montserrat`, `App.module.scss` с layout и sidebar.
5. **Типы + Repository**: `src/types/index.ts`, `Repository` интерфейс, `LocalRepository`, `migrations.ts`.
6. **Zustand store**: `useAppStore` с actions (addTask, updateTask, deleteTask с каскадом, toggleStatus, toggleImportant, attachFile через IDB, replaceAll, reset), persist с `partialize` (без blob-ов).
7. **Доменная логика**: `recurrence.ts` (порт [app.js:103-121](app.js#L103-L121)), `horizons.ts` (порт [app.js:209-273](app.js#L209-L273)), `sorting.ts` (порт [app.js:200-206](app.js#L200-L206)).
8. **Общие компоненты**: `TaskCard` (порт [app.js:554-579](app.js#L554-L579)), `Column`, `Modal`, `TagDropdown` (с `@floating-ui/react` для позиционирования — заменяет ручной `getBoundingClientRect` из [app.js:855-858](app.js#L855-L858)).
9. **InboxPage**: самый простой экран, обкатываем связку store + TaskCard.
10. **Days / Weeks / Years**: три страницы по шаблону `ColumnsView` (4 колонки), первое знакомство с dnd-kit.
11. **ProjectPage (Kanban)**: 3 колонки по статусам, второй сценарий DnD.
12. **SettingsPage**: export / import / reset. Критично — через это переедет реальный пользователь.
13. **TaskModal** (сердце приложения, см. раздел «Модальный стек»).
14. **DatePickerPopup**: все 5 табов (День / Неделя / Месяц / Год / Жизнь), порт [app.js:889-1126](app.js#L889-L1126).
15. **ProjectModal**: форма проекта с эмодзи-гридом из [app.js:1294-1299](app.js#L1294-L1299).
16. **HorizonsPage**: самый сложный экран — 6 колонок, горизонтальный скролл, DnD между колонками (см. раздел «Horizontal drag-scroll»).
17. **CalendarPage**: месячная сетка, порт [app.js:435-484](app.js#L435-L484).
18. **Polish + удаление старого кода**: пиксельное сравнение с ваниллой, затем удаление `app.js` / `styles.css` / `index.html` из корня.

## Критичные технические решения

### Модальный стек подзадач

Отдельный `useModalStore` с массивом `taskStack: string[]`. `TaskModal` рендерит задачу из `taskStack.at(-1)`. Локальный draft (useReducer внутри компонента) коммитится в глобальный стор при:
- смене activeId (push/pop стека),
- создании подзадачи через Enter,
- закрытии модалки.

Заменяет `window.__draftTask` + императивный `modalStack` из ванилы ([app.js:670-780](app.js#L670-L780)). Кнопка «← Назад к родителю» показывается при `taskStack.length > 1`.

### Horizontal drag-scroll

Кастомный хук `useDragScroll` для контейнера Horizons. Ключевой момент — селектор-исключение `.task-card, .add-task-btn, [data-dnd-handle]`: чтобы drag-scroll не конфликтовал с dnd-kit. Порт [app.js:642-668](app.js#L642-L668).

### Attachments в IDB

- `task.attachments` в сторе содержит только `AttachmentMeta` (id, name, type, size).
- Blob пишется в IDB отдельно через `repository.saveAttachment`.
- Компонент `<AttachmentLink>` лениво подгружает blob: `loadAttachmentBlob(id)` → `URL.createObjectURL` → `revokeObjectURL` в cleanup.
- `partialize` в Zustand persist НЕ пропускает blob-ы в localStorage — только метаданные.

## Критичные файлы ванильной версии для изучения при реализации

- [app.js](app.js) — весь файл, особенно:
  - [app.js:1-50](app.js#L1-L50) — loadState и миграция старых полей
  - [app.js:103-121](app.js#L103-L121) — `taskOccursOn` (порт 1-в-1)
  - [app.js:197-240](app.js#L197-L240) — `tasksOnDate`, `taskSorter`, `horizonBucket`
  - [app.js:242-293](app.js#L242-L293) — `renderHorizons` с повторами
  - [app.js:295-378](app.js#L295-L378) — Days / Weeks / Years
  - [app.js:436-484](app.js#L436-L484) — Calendar
  - [app.js:581-639](app.js#L581-L639) — drag&drop handlers
  - [app.js:642-668](app.js#L642-L668) — `attachDragScroll`
  - [app.js:670-780](app.js#L670-L780) — TaskModal + стек + draft
  - [app.js:889-1126](app.js#L889-L1126) — DatePickerPopup
  - [app.js:1179-1260](app.js#L1179-L1260) — attachments + `fileToDataUrl`
  - [app.js:1268-1290](app.js#L1268-L1290) — каскадное удаление
  - [app.js:1292-1363](app.js#L1292-L1363) — ProjectModal
- [index.html](index.html) — разметка модалок (строки 39-171), готовая спецификация на JSX
- [styles.css](styles.css) — источник для SCSS-модулей (секции → `<Component>.module.scss`)

## Верификация

Запуск: `cd front && npm run dev` → `http://localhost:5173`.

**Сценарии** (прогнать после этапов 9, 11, 13, 16, 17):

1. **Миграция старых данных**: в ванильной версии создать проект, задачу с подзадачей, задачу с PDF-вложением. Открыть React-версию на том же origin — данные на месте, файл доступен.
2. **CRUD задач**: в Inbox добавить идею через Enter → открыть в модалке → изменить → сохранить.
3. **Модальный стек**: открыть задачу с подзадачей → клик на подзадачу → модалка переключилась, кнопка «← Родитель» видна → «Назад» возвращает к родителю.
4. **DatePicker**: 5 табов переключаются, неделя/месяц/год выбираются, результат применяется к задаче.
5. **Horizons DnD**: перенос карточки «На год» → «Сегодня» обновляет `dateType/date`.
6. **Horizontal drag-scroll**: зажать пустое место + потянуть = прокрутка; Shift+wheel тоже прокручивает.
7. **Kanban DnD**: перенос карточки To Do → Done меняет `status`.
8. **Рекуррентность**: задача с `repeat:daily` появляется на каждый день в Days-экране.
9. **Attachments**: прикрепить картинку 1 МБ → `localStorage` не содержит base64, в IndexedDB есть ключ `attachment:<id>`.
10. **Settings**: Export → JSON-файл; Reset → пусто; Import того же файла → восстановление.
11. **Sidebar**: создание / перестановка / удаление проекта, задачи осиротевшего проекта сохраняются.

Финально: `npm run build` без TS-ошибок, `npm run lint` чист.
