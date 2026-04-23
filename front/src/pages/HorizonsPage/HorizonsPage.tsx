import { DndContext } from '@dnd-kit/core'
import {
  useCreateTask,
  useHorizonBuckets,
  useUpdateTask,
} from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import { Column } from '@/components/Column/Column'
import type { ColumnDropContext } from '@/components/Column/Column'
import { handleBoardDragEnd, useBoardSensors } from '@/lib/dnd'
import { HORIZON_LABEL, HORIZON_ORDER } from '@/lib/domain/horizons'
import type { HorizonBucket } from '@/lib/domain/horizons'
import type { DateType } from '@/types'
import { addDays, startOfMonth, startOfWeek, startOfYear, todayISO, ymd } from '@/lib/dates'
import { useDragScroll } from '@/lib/hooks/useDragScroll'
import styles from './HorizonsPage.module.scss'

function ctxForBucket(bucket: HorizonBucket): ColumnDropContext {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  switch (bucket) {
    case 'today':
      return { dateType: 'day', date: todayISO() }
    case 'tomorrow':
      return { dateType: 'day', date: ymd(addDays(today, 1)) }
    case 'week':
      return { dateType: 'week', date: ymd(startOfWeek(today)) }
    case 'month':
      return { dateType: 'month', date: ymd(startOfMonth(today)) }
    case 'year':
      return { dateType: 'year', date: ymd(startOfYear(today)) }
    case 'life':
      return { dateType: 'life', date: null }
  }
}

export function HorizonsPage() {
  const buckets = useHorizonBuckets()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const openTask = useModalStore((s) => s.openTask)
  const scrollRef = useDragScroll<HTMLDivElement>()
  const sensors = useBoardSensors()

  const handleAddTask = async (ctx: ColumnDropContext) => {
    const t = await createTask.mutateAsync({
      title: '',
      dateType: (ctx.dateType ?? 'none') as DateType,
      date: ctx.date ?? null,
    })
    openTask(t.id)
  }

  return (
    <>
      <h1 className="view-title">🎯 Horizons</h1>
      <p className="view-subtitle">Сегодня в фокусе, остальное — распределено по горизонтам</p>
      <DndContext
        sensors={sensors}
        onDragEnd={(e) =>
          handleBoardDragEnd(e, (id, patch) => updateTask.mutate({ id, patch }))
        }
      >
        <div ref={scrollRef} className={styles.hScroll}>
          <div className={styles.columns}>
            {HORIZON_ORDER.map((bucket) => {
              const ctx = ctxForBucket(bucket)
              return (
                <Column
                  key={bucket}
                  id={`horizon-${bucket}`}
                  title={HORIZON_LABEL[bucket]}
                  tasks={buckets[bucket]}
                  today={bucket === 'today'}
                  draggableCards
                  addContext={ctx}
                  dropContext={ctx}
                  onAddTask={(c) => {
                    void handleAddTask(c)
                  }}
                />
              )
            })}
          </div>
        </div>
      </DndContext>
    </>
  )
}
