import { useMemo } from 'react'
import { DndContext } from '@dnd-kit/core'
import { useCreateTask, useTasks, useUpdateTask } from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import { Column } from '@/components/Column/Column'
import type { ColumnDropContext } from '@/components/Column/Column'
import { handleBoardDragEnd, useBoardSensors } from '@/lib/dnd'
import { taskOccursOn } from '@/lib/domain/recurrence'
import { taskSorter } from '@/lib/domain/sorting'
import { addDays, DAY_NAMES, formatDateLong, ymd } from '@/lib/dates'
import styles from './DaysPage.module.scss'

export function DaysPage() {
  const tasks = useTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const openTask = useModalStore((s) => s.openTask)
  const sensors = useBoardSensors()

  const columns = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 4 }, (_, i) => {
      const d = addDays(today, i)
      const dayTasks = tasks
        .filter((t) => !t.parentId && taskOccursOn(t, d))
        .sort(taskSorter)
      const title =
        i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : DAY_NAMES[d.getDay()]
      return {
        id: `day-${ymd(d)}`,
        title,
        subtitle: formatDateLong(d),
        tasks: dayTasks,
        today: i === 0,
        ctx: { dateType: 'day', date: ymd(d) } as ColumnDropContext,
      }
    })
  }, [tasks])

  const handleAddTask = async (ctx: ColumnDropContext) => {
    const t = await createTask.mutateAsync({
      title: '',
      dateType: ctx.dateType,
      date: ctx.date,
    })
    openTask(t.id)
  }

  return (
    <>
      <h1 className="view-title">Days</h1>
      <p className="view-subtitle">Ближайшие 4 дня</p>
      <DndContext
        sensors={sensors}
        onDragEnd={(e) =>
          handleBoardDragEnd(e, (id, patch) => updateTask.mutate({ id, patch }))
        }
      >
        <div className={styles.columns}>
          {columns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              subtitle={col.subtitle}
              tasks={col.tasks}
              today={col.today}
              draggableCards
              addContext={col.ctx}
              dropContext={col.ctx}
              onAddTask={(c) => {
                void handleAddTask(c)
              }}
            />
          ))}
        </div>
      </DndContext>
    </>
  )
}
