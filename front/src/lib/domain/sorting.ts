import type { Status, Task } from '@/types'

const STATUS_ORDER: Record<Status, number> = {
  'in-progress': 0,
  todo: 1,
  done: 2,
}

export function taskSorter(a: Task, b: Task): number {
  const ai = a.important ? 0 : 1
  const bi = b.important ? 0 : 1
  if (ai !== bi) return ai - bi
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
}
