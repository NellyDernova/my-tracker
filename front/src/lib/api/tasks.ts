import type { DateType, RepeatKind, Status, Task, Weekday } from '@/types'
import { api } from './client'

export type ServerTask = Omit<Task, 'attachments'>

export type TaskCreateInput = {
  title: string
  description?: string
  projectId?: string | null
  parentId?: string | null
  dateType?: DateType
  date?: string | null
  status?: Status
  repeat?: RepeatKind
  repeatDays?: Weekday[]
  important?: boolean
  position?: number
}

export type TaskUpdateInput = Partial<TaskCreateInput>

export type TaskListQuery = {
  projectId?: string
  parentId?: string
  date?: string
  status?: Status
  rootOnly?: boolean
}

function toQueryString(q: TaskListQuery | undefined): string {
  if (!q) return ''
  const params = new URLSearchParams()
  if (q.projectId) params.set('projectId', q.projectId)
  if (q.parentId) params.set('parentId', q.parentId)
  if (q.date) params.set('date', q.date)
  if (q.status) params.set('status', q.status)
  if (q.rootOnly) params.set('rootOnly', 'true')
  const s = params.toString()
  return s ? `?${s}` : ''
}

export const tasksApi = {
  list: (q?: TaskListQuery) =>
    api.get<ServerTask[]>(`/api/tasks${toQueryString(q)}`),
  get: (id: string) => api.get<ServerTask>(`/api/tasks/${id}`),
  create: (input: TaskCreateInput) =>
    api.post<ServerTask>('/api/tasks', input),
  update: (id: string, patch: TaskUpdateInput) =>
    api.patch<ServerTask>(`/api/tasks/${id}`, patch),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
  reorder: (ids: string[]) =>
    api.post<ServerTask[]>('/api/tasks/reorder', { ids }),
}
