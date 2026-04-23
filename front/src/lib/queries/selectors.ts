import { useMemo } from 'react'
import type { Task } from '@/types'
import { bucketizeTasks } from '@/lib/domain/horizons'
import { taskOccursOn } from '@/lib/domain/recurrence'
import { taskSorter } from '@/lib/domain/sorting'
import { useTasks } from './tasks'

export function useInboxTasks(): Task[] {
  const tasks = useTasks()
  return useMemo(
    () =>
      tasks
        .filter((t) => !t.parentId && !t.projectId && t.dateType === 'none')
        .sort(taskSorter),
    [tasks],
  )
}

export function useTasksOnDate(date: Date): Task[] {
  const tasks = useTasks()
  return useMemo(
    () =>
      tasks
        .filter((t) => !t.parentId && taskOccursOn(t, date))
        .sort(taskSorter),
    [tasks, date],
  )
}

export function useProjectTasks(projectId: string | undefined | null): Task[] {
  const tasks = useTasks()
  return useMemo(
    () =>
      projectId
        ? tasks
            .filter((t) => !t.parentId && t.projectId === projectId)
            .sort(taskSorter)
        : [],
    [tasks, projectId],
  )
}

export function useHorizonBuckets() {
  const tasks = useTasks()
  return useMemo(() => bucketizeTasks(tasks), [tasks])
}

export function useChildTasks(parentId: string | undefined): Task[] {
  const tasks = useTasks()
  return useMemo(
    () =>
      parentId
        ? tasks.filter((t) => t.parentId === parentId).sort(taskSorter)
        : [],
    [tasks, parentId],
  )
}
