import { useMemo } from 'react'
import { DndContext } from '@dnd-kit/core'
import { useCreateTask, useTasks, useUpdateTask } from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import { Column } from '@/components/Column/Column'
import type { ColumnDropContext } from '@/components/Column/Column'
import { handleBoardDragEnd, useBoardSensors } from '@/lib/dnd'
import { taskSorter } from '@/lib/domain/sorting'
import { parseYmd } from '@/lib/dates'
import styles from '../DaysPage/DaysPage.module.scss'

export function YearsPage() {
  const tasks = useTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const openTask = useModalStore((s) => s.openTask)
  const sensors = useBoardSensors()

  const columns = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 4 }, (_, i) => {
      const yr = y + i
      const yStart = new Date(yr, 0, 1)
      const yEnd = new Date(yr, 11, 31, 23, 59, 59, 999)
      const yrTasks = tasks
        .filter((t) => {
          if (t.parentId) return false
          if (!t.date) return false
          if (
            t.dateType === 'year' ||
            t.dateType === 'month' ||
            t.dateType === 'week' ||
            t.dateType === 'day'
          ) {
            const d = parseYmd(t.date)
            if (!d) return false
            return d >= yStart && d <= yEnd
          }
          return false
        })
        .sort(taskSorter)
      return {
        id: `year-${yr}`,
        title: String(yr),
        tasks: yrTasks,
        today: i === 0,
        ctx: { dateType: 'year', date: `${yr}-01-01` } as ColumnDropContext,
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
      <h1 className="view-title">Years</h1>
      <p className="view-subtitle">Ближайшие 4 года</p>
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
