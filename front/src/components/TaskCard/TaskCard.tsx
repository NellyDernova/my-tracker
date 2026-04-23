import type { CSSProperties, MouseEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import clsx from 'clsx'
import type { Task } from '@/types'
import {
  useChildTasks,
  useProjects,
  useToggleTaskImportant,
  useToggleTaskStatus,
} from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import styles from './TaskCard.module.scss'

interface TaskCardProps {
  task: Task
  draggable?: boolean
}

const FireIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
    <path d="M13.5 2c-.3 1.7-1 3.3-2 4.7-1 1.5-2.2 2.8-3.5 4.1-1 .9-1.9 1.8-2.6 2.8-.7 1-1.1 2.2-1.1 3.4 0 2 .8 3.8 2.2 5.2C7.9 23.4 9.8 24 12 24c2.2 0 4.1-.6 5.5-2 1.4-1.4 2.2-3.2 2.2-5.2 0-1.3-.2-2.6-.7-3.9-.5-1.3-1.1-2.5-1.9-3.6-.9-1.2-1.8-2.4-2.5-3.6-.6-1.2-1-2.5-1.1-3.8zm-.1 12.6c.7.7 1.4 1.5 1.9 2.4.5.9.8 1.9.8 3 0 1.3-.5 2.5-1.4 3.4-.9.9-2.1 1.4-3.4 1.4s-2.5-.5-3.4-1.4c-.9-.9-1.4-2.1-1.4-3.4 0-.9.2-1.7.7-2.4.5-.7 1.1-1.4 1.8-2 .6-.5 1.1-1.1 1.6-1.8.4-.7.7-1.4.8-2.2.3.7.6 1.3 1 1.9.4.4.7.7 1 1.1z" />
  </svg>
)

const RepeatIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width={10}
    height={10}
    fill="none"
    stroke="#8b6fd8"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
)

export function TaskCard({ task, draggable = false }: TaskCardProps) {
  if (draggable) {
    return <DraggableTaskCard task={task} />
  }
  return <StaticTaskCard task={task} />
}

function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { taskId: task.id },
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  return (
    <TaskCardContent
      task={task}
      dragRef={setNodeRef}
      dragHandlers={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      style={style}
    />
  )
}

function StaticTaskCard({ task }: { task: Task }) {
  return <TaskCardContent task={task} />
}

interface ContentProps {
  task: Task
  dragRef?: (node: HTMLElement | null) => void
  dragHandlers?: Record<string, unknown>
  isDragging?: boolean
  style?: CSSProperties
}

function TaskCardContent({ task, dragRef, dragHandlers, isDragging, style }: ContentProps) {
  const { data: projects = [] } = useProjects()
  const project = task.projectId
    ? projects.find((p) => p.id === task.projectId)
    : undefined
  const children = useChildTasks(task.id)
  const toggleStatus = useToggleTaskStatus()
  const toggleImportant = useToggleTaskImportant()
  const openTask = useModalStore((s) => s.openTask)

  const doneCount = children.filter((c) => c.status === 'done').length
  const checkSym = task.status === 'done' ? '✓' : task.status === 'in-progress' ? '◐' : ''

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation()
    toggleStatus(task.id)
  }
  const handleFire = (e: MouseEvent) => {
    e.stopPropagation()
    toggleImportant(task.id)
  }
  const handleCardClick = () => {
    openTask(task.id)
  }

  return (
    <div
      ref={dragRef}
      className={clsx(
        styles.taskCard,
        task.status === 'done' && styles.done,
        isDragging && styles.dragging,
      )}
      style={style}
      onClick={handleCardClick}
      {...(dragHandlers ?? {})}
    >
      <button
        type="button"
        className={clsx(
          styles.check,
          task.status === 'done' && styles.checked,
          task.status === 'in-progress' && styles.inProgress,
        )}
        onClick={handleToggle}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Изменить статус"
      >
        {checkSym}
      </button>
      <div className={styles.body}>
        <div className={styles.text}>{task.title}</div>
        {(project || children.length > 0 || task.attachments.length > 0 ||
          (task.repeat && task.repeat !== 'none')) && (
          <div className={styles.meta}>
            {project && (
              <span className={styles.proj}>
                {project.emoji || '📁'} {project.name}
              </span>
            )}
            {children.length > 0 && (
              <span className={styles.badge}>
                {doneCount}/{children.length} ✓
              </span>
            )}
            {task.attachments.length > 0 && (
              <span className={styles.badge}>📎 {task.attachments.length}</span>
            )}
            {task.repeat && task.repeat !== 'none' && (
              <span className={styles.badge}>
                <RepeatIcon />
              </span>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        className={clsx(styles.fire, task.important && styles.on)}
        onClick={handleFire}
        onPointerDown={(e) => e.stopPropagation()}
        title={task.important ? 'Убрать важность' : 'Отметить важной'}
      >
        <FireIcon />
      </button>
    </div>
  )
}
