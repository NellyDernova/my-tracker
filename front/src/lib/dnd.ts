import type { DragEndEvent } from '@dnd-kit/core'
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { ColumnDropContext } from '@/components/Column/Column'
import type { TaskUpdateInput } from '@/lib/api'

export function useBoardSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
}

export function handleBoardDragEnd(
  event: DragEndEvent,
  updateTask: (id: string, patch: TaskUpdateInput) => void,
): void {
  const { active, over } = event
  if (!over) return
  const ctx = (over.data.current as { dropContext?: ColumnDropContext } | undefined)
    ?.dropContext
  if (!ctx) return
  const taskId = (active.data.current as { taskId?: string } | undefined)?.taskId
  if (!taskId) return
  const patch: TaskUpdateInput = {}
  if (ctx.status !== undefined) patch.status = ctx.status
  if (ctx.projectId !== undefined) patch.projectId = ctx.projectId
  if (ctx.dateType !== undefined) patch.dateType = ctx.dateType
  if (ctx.date !== undefined) patch.date = ctx.date
  updateTask(taskId, patch)
}
