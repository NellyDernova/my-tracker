import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { AttachmentMeta, Task, Weekday } from '@/types'
import {
  useAttachFile,
  useChildTasks,
  useCreateTask,
  useDeleteTask,
  useProjects,
  useRemoveAttachment,
  useTaskById,
  useToggleTaskStatus,
  useUpdateTask,
} from '@/lib/queries'
import { useAttachmentsStore } from '@/store/useAttachmentsStore'
import { useModalStore } from '@/store/useModalStore'
import { Modal } from '@/components/Modal/Modal'
import { TagDropdown } from '@/components/TagDropdown/TagDropdown'
import { AttachmentLink } from './AttachmentLink'
import { DatePickerPopup } from '@/components/DatePicker/DatePickerPopup'
import { STATUSES, STATUS_EMOJI, STATUS_LABEL } from '@/constants/statuses'
import { REPEAT_OPTIONS, WEEKDAY_SHORT } from '@/constants/repeat'
import { addDays, isoWeekNum, MONTH_NAMES, MONTH_SHORT, parseYmd, sameDay, startOfWeek, endOfWeek, ymdShort } from '@/lib/dates'
import styles from './TaskModal.module.scss'

type Draft = Omit<Task, 'attachments'>

const EMPTY_ATTACHMENTS: AttachmentMeta[] = []

function useDraftSync(taskId: string | undefined): [Draft | null, (patch: Partial<Draft>) => void, () => void] {
  const storeTask = useTaskById(taskId)
  const updateTask = useUpdateTask()
  const [draft, setDraft] = useState<Draft | null>(null)

  const lastIdRef = useRef<string | undefined>(undefined)
  const draftRef = useRef<Draft | null>(null)
  draftRef.current = draft
  const storeTaskRef = useRef(storeTask)
  storeTaskRef.current = storeTask
  const updateRef = useRef(updateTask)
  updateRef.current = updateTask

  // Switch draft when activeId changes; flush the previous one.
  useEffect(() => {
    if (lastIdRef.current && lastIdRef.current !== taskId && draftRef.current) {
      flushDraft(lastIdRef.current, draftRef.current, (id, patch) =>
        updateRef.current.mutate({ id, patch }),
      )
    }
    lastIdRef.current = taskId
    setDraft(storeTaskRef.current ? stripAttachments(storeTaskRef.current) : null)
  }, [taskId])

  // Hydrate draft once storeTask arrives (query still loading on first open).
  useEffect(() => {
    if (!draftRef.current && storeTask && storeTask.id === taskId) {
      setDraft(stripAttachments(storeTask))
    }
  }, [storeTask, taskId])

  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d))
  const flush = () => {
    if (lastIdRef.current && draftRef.current) {
      flushDraft(lastIdRef.current, draftRef.current, (id, patch) =>
        updateRef.current.mutate({ id, patch }),
      )
    }
  }
  return [draft, patch, flush]
}

function stripAttachments(t: Task): Draft {
  const { attachments: _attachments, ...rest } = t
  void _attachments
  return rest
}

function flushDraft(
  id: string,
  draft: Draft,
  update: (id: string, patch: Partial<Draft>) => void,
): void {
  const { id: _id, createdAt: _createdAt, ...patch } = draft
  void _id
  void _createdAt
  update(id, patch)
}

function dateLabel(draft: Draft): { label: string; hasDate: boolean } {
  if (draft.dateType === 'life') return { label: '∞ Жизнь', hasDate: true }
  if (!draft.date) return { label: 'Без даты', hasDate: false }
  const d = parseYmd(draft.date)
  if (!d) return { label: 'Без даты', hasDate: false }
  if (draft.dateType === 'day') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (sameDay(d, today)) return { label: 'Сегодня', hasDate: true }
    if (sameDay(d, addDays(today, 1))) return { label: 'Завтра', hasDate: true }
    return {
      label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()].toLowerCase()} ${d.getFullYear()}`,
      hasDate: true,
    }
  }
  if (draft.dateType === 'week') {
    return {
      label: `Неделя ${isoWeekNum(d)} (${ymdShort(startOfWeek(d))} – ${ymdShort(endOfWeek(d))})`,
      hasDate: true,
    }
  }
  if (draft.dateType === 'month') {
    return { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, hasDate: true }
  }
  if (draft.dateType === 'year') {
    return { label: `${d.getFullYear()}`, hasDate: true }
  }
  return { label: 'Без даты', hasDate: false }
}

export function TaskModal() {
  const taskStack = useModalStore((s) => s.taskStack)
  const closeTask = useModalStore((s) => s.closeTask)
  const goBackToParent = useModalStore((s) => s.goBackToParent)
  const openChildTask = useModalStore((s) => s.openChildTask)

  const activeId = taskStack.at(-1)
  const parentId = taskStack.length > 1 ? taskStack[taskStack.length - 2] : null

  const [draft, patch, flush] = useDraftSync(activeId)

  const children = useChildTasks(activeId)
  const parentTask = useTaskById(parentId ?? undefined)
  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const attachFile = useAttachFile()
  const removeAttachment = useRemoveAttachment()
  const attachments = useAttachmentsStore((s) =>
    activeId ? s.byTaskId[activeId] ?? EMPTY_ATTACHMENTS : EMPTY_ATTACHMENTS,
  )
  const project = projects.find((p) => p.id === draft?.projectId)

  const [subtaskInput, setSubtaskInput] = useState('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeId) {
      setTimeout(() => titleInputRef.current?.focus(), 50)
    }
    setSubtaskInput('')
  }, [activeId])

  const handleClose = () => {
    flush()
    closeTask()
  }

  const handleBack = () => {
    flush()
    goBackToParent()
  }

  const handleDelete = () => {
    if (!activeId) return
    if (!confirm('Удалить задачу? Все её подзадачи будут тоже удалены.')) return
    deleteTask.mutate(activeId)
    if (parentId) goBackToParent()
    else closeTask()
  }

  const handleAddSubtask = async () => {
    const v = subtaskInput.trim()
    if (!v || !activeId || !draft) return
    flush()
    await createTask.mutateAsync({
      title: v,
      parentId: activeId,
      projectId: draft.projectId ?? null,
    })
    setSubtaskInput('')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !activeId || !draft) return
    flush()
    for (const file of Array.from(files)) {
      if (file.size > 4 * 1024 * 1024) {
        if (!confirm(`Файл "${file.name}" больше 4MB. Всё равно добавить?`)) continue
      }
      await attachFile(activeId, file)
    }
    e.target.value = ''
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!activeId) return
    await removeAttachment(activeId, attachmentId)
  }

  const toggleWeekday = (wd: Weekday) => {
    if (!draft) return
    const has = draft.repeatDays.includes(wd)
    patch({
      repeatDays: has
        ? draft.repeatDays.filter((x) => x !== wd)
        : [...draft.repeatDays, wd].sort(),
    })
  }

  const dateBadge = useMemo(() => (draft ? dateLabel(draft) : null), [draft])

  if (!activeId || !draft || !dateBadge) {
    return <DatePickerPopup open={false} onApply={() => {}} onClose={() => {}} value={{ dateType: 'none', date: null }} />
  }

  return (
    <Modal open={true} onClose={handleClose} size="task">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {parentId && (
            <button type="button" className={styles.backBtn} onClick={handleBack}>
              ← {parentTask?.title || 'Родитель'}
            </button>
          )}
          <div className={styles.tags}>
            <TagDropdown<string>
              trigger={({ ref, triggerProps }) => (
                <button
                  ref={ref as React.Ref<HTMLButtonElement>}
                  type="button"
                  className={clsx(styles.tag, styles.tagProject)}
                  {...(triggerProps as React.ComponentProps<'button'>)}
                >
                  {project ? (
                    <>
                      {project.emoji || '📁'} {project.name}
                    </>
                  ) : (
                    'Без проекта'
                  )}{' '}
                  <span className={styles.chev}>▾</span>
                </button>
              )}
              items={[
                {
                  key: '__none__',
                  label: '📂 Без проекта',
                  selected: !draft.projectId,
                  onSelect: () => patch({ projectId: null }),
                },
                ...projects.map((p) => ({
                  key: p.id,
                  label: (
                    <>
                      {p.emoji || '📁'} {p.name}
                    </>
                  ),
                  selected: draft.projectId === p.id,
                  onSelect: () => patch({ projectId: p.id }),
                })),
              ]}
            />
            <TagDropdown<string>
              trigger={({ ref, triggerProps }) => (
                <button
                  ref={ref as React.Ref<HTMLButtonElement>}
                  type="button"
                  className={clsx(
                    styles.tag,
                    draft.status === 'todo' && styles.tagStatusTodo,
                    draft.status === 'in-progress' && styles.tagStatusInProgress,
                    draft.status === 'done' && styles.tagStatusDone,
                  )}
                  {...(triggerProps as React.ComponentProps<'button'>)}
                >
                  {STATUS_EMOJI[draft.status]} {STATUS_LABEL[draft.status]}{' '}
                  <span className={styles.chev}>▾</span>
                </button>
              )}
              items={STATUSES.map((s) => ({
                key: s.key,
                label: (
                  <>
                    {s.emoji} {s.label}
                  </>
                ),
                selected: draft.status === s.key,
                onSelect: () => patch({ status: s.key }),
              }))}
            />
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={clsx(styles.fireBtn, draft.important && styles.on)}
            onClick={() => patch({ important: !draft.important })}
            title={draft.important ? 'Убрать важность' : 'Отметить важной'}
          >
            <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
              <path d="M13.5 2c-.3 1.7-1 3.3-2 4.7-1 1.5-2.2 2.8-3.5 4.1-1 .9-1.9 1.8-2.6 2.8-.7 1-1.1 2.2-1.1 3.4 0 2 .8 3.8 2.2 5.2C7.9 23.4 9.8 24 12 24c2.2 0 4.1-.6 5.5-2 1.4-1.4 2.2-3.2 2.2-5.2 0-1.3-.2-2.6-.7-3.9-.5-1.3-1.1-2.5-1.9-3.6-.9-1.2-1.8-2.4-2.5-3.6-.6-1.2-1-2.5-1.1-3.8zm-.1 12.6c.7.7 1.4 1.5 1.9 2.4.5.9.8 1.9.8 3 0 1.3-.5 2.5-1.4 3.4-.9.9-2.1 1.4-3.4 1.4s-2.5-.5-3.4-1.4c-.9-.9-1.4-2.1-1.4-3.4 0-.9.2-1.7.7-2.4.5-.7 1.1-1.4 1.8-2 .6-.5 1.1-1.1 1.6-1.8.4-.7.7-1.4.8-2.2.3.7.6 1.3 1 1.9.4.4.7.7 1 1.1z" />
            </svg>
          </button>
          <button type="button" className={styles.closeBtn} onClick={handleClose}>
            ✕
          </button>
        </div>
      </div>

      <input
        ref={titleInputRef}
        type="text"
        className={styles.titleInput}
        placeholder="Название задачи"
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
      />

      <div className={styles.row}>
        <label className={styles.label}>Когда</label>
        <button
          type="button"
          className={clsx(styles.tag, styles.tagDate, dateBadge.hasDate && styles.tagDateHasDate)}
          onClick={() => setDatePickerOpen(true)}
        >
          {dateBadge.label} <span className={styles.chev}>▾</span>
        </button>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>Повтор</label>
        <select
          className={styles.select}
          value={draft.repeat}
          onChange={(e) => patch({ repeat: e.target.value as Task['repeat'] })}
        >
          {REPEAT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {draft.repeat === 'custom-weekdays' && (
        <div className={styles.row}>
          <label className={styles.label}>Дни</label>
          <div className={styles.weekdaysPicker}>
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
              <label key={wd}>
                <input
                  type="checkbox"
                  checked={draft.repeatDays.includes(wd as Weekday)}
                  onChange={() => toggleWeekday(wd as Weekday)}
                />
                {WEEKDAY_SHORT[wd]}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={styles.row}>
        <label className={styles.label}>Файлы</label>
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
      </div>

      {attachments.length > 0 && (
        <div className={styles.attachments}>
          {attachments.map((a) => (
            <AttachmentLink
              key={a.id}
              attachment={a}
              onDelete={() => void handleRemoveAttachment(a.id)}
            />
          ))}
        </div>
      )}

      <div className={styles.subtasksSection}>
        <div className={styles.subtasksHeader}>Подзадачи</div>
        <div className={styles.subtasksList}>
          {children.map((c) => (
            <SubtaskRow key={c.id} child={c} onOpen={() => {
              flush()
              openChildTask(c.id)
            }} />
          ))}
        </div>
        <div className={styles.subtaskAdd}>
          <input
            type="text"
            placeholder="+ Добавить подзадачу (Enter)"
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAddSubtask()
            }}
          />
        </div>
        {children.length > 0 && (
          <div className={styles.subtasksHint}>
            Клик на подзадачу открывает её отдельно со всеми полями
          </div>
        )}
      </div>

      <div className={clsx(styles.row, styles.rowVertical)}>
        <label className={styles.label}>Описание</label>
        <textarea
          className={styles.descInput}
          placeholder="Заметки, детали, ссылки…"
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          Удалить
        </button>
        <div className={styles.spacer} />
        <button type="button" className="btn btn-ghost" onClick={handleClose}>
          Отмена
        </button>
        <button type="button" className="btn btn-primary" onClick={handleClose}>
          Сохранить
        </button>
      </div>

      <DatePickerPopup
        open={datePickerOpen}
        value={{ dateType: draft.dateType, date: draft.date }}
        onApply={(v) => {
          patch({ dateType: v.dateType, date: v.date })
          setDatePickerOpen(false)
        }}
        onClose={() => setDatePickerOpen(false)}
      />
    </Modal>
  )
}

function SubtaskRow({ child, onOpen }: { child: Task; onOpen: () => void }) {
  const toggleStatus = useToggleTaskStatus()
  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        background: 'var(--surface-2)',
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggleStatus(child.id)
        }}
        style={{
          width: 14,
          height: 14,
          border: '1.5px solid var(--text-soft)',
          borderRadius: 4,
          background: child.status === 'done' ? 'var(--accent)' : 'white',
          color: 'white',
          fontSize: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          padding: 0,
        }}
      >
        {child.status === 'done' ? '✓' : child.status === 'in-progress' ? '◐' : ''}
      </button>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          textDecoration: child.status === 'done' ? 'line-through' : 'none',
          color: child.status === 'done' ? 'var(--text-muted)' : 'var(--text)',
        }}
      >
        {child.title || '(без названия)'}
      </span>
    </div>
  )
}
