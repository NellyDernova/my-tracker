import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import type { Task } from '@/types'
import { TaskCard } from '@/components/TaskCard/TaskCard'
import styles from './Column.module.scss'

export interface ColumnDropContext {
  status?: Task['status']
  projectId?: string | null
  dateType?: Task['dateType']
  date?: string | null
}

interface ColumnProps {
  id: string
  title: string
  subtitle?: string
  tasks: Task[]
  today?: boolean
  draggableCards?: boolean
  addContext?: ColumnDropContext
  dropContext?: ColumnDropContext
  onAddTask?: (ctx: ColumnDropContext) => void
}

export function Column({
  id,
  title,
  subtitle,
  tasks,
  today,
  draggableCards = false,
  addContext,
  dropContext,
  onAddTask,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { dropContext: dropContext ?? {} },
  })

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        styles.column,
        today && styles.today,
        isOver && styles.dragOver,
      )}
    >
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.date}>{subtitle}</div>}
      </div>
      <div className={styles.tasks}>
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} draggable={draggableCards} />
        ))}
      </div>
      {onAddTask && (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => onAddTask(addContext ?? {})}
        >
          + Добавить задачу
        </button>
      )}
    </div>
  )
}
