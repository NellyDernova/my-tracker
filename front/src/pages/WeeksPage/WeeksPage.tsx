import { useMemo } from 'react'
import { DndContext } from '@dnd-kit/core'
import { useCreateTask, useTasks, useUpdateTask } from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import { Column } from '@/components/Column/Column'
import type { ColumnDropContext } from '@/components/Column/Column'
import { handleBoardDragEnd, useBoardSensors } from '@/lib/dnd'
import { taskSorter } from '@/lib/domain/sorting'
import {
  addDays,
  endOfWeek,
  isoWeekNum,
  parseYmd,
  startOfWeek,
  ymd,
  ymdShort,
} from '@/lib/dates'
import styles from '../DaysPage/DaysPage.module.scss'

export function WeeksPage() {
  const tasks = useTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const openTask = useModalStore((s) => s.openTask)
  const sensors = useBoardSensors()

  const columns = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const baseStart = startOfWeek(today)
    return Array.from({ length: 4 }, (_, i) => {
      const wStart = addDays(baseStart, 7 * i)
      const wEnd = endOfWeek(wStart)
      const weekTasks = tasks
        .filter((t) => {
          if (t.parentId) return false
          if (!t.date) return false
          if (t.dateType === 'week' || t.dateType === 'day') {
            const d = parseYmd(t.date)
            if (!d) return false
            return d >= wStart && d <= wEnd
          }
          return false
        })
        .sort(taskSorter)
      return {
        id: `week-${ymd(wStart)}`,
        title: `${ymdShort(wStart)} – ${ymdShort(wEnd)}`,
        subtitle: `Неделя ${isoWeekNum(wStart)}`,
        tasks: weekTasks,
        today: i === 0,
        ctx: { dateType: 'week', date: ymd(wStart) } as ColumnDropContext,
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
      <h1 className="view-title">Weeks</h1>
      <p className="view-subtitle">Ближайшие 4 недели</p>
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
