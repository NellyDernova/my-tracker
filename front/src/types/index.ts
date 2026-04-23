export type Status = 'todo' | 'in-progress' | 'done'

export type DateType = 'none' | 'day' | 'week' | 'month' | 'year' | 'life'

export type RepeatKind =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'custom-weekdays'
  | 'monthly'
  | 'yearly'

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface AttachmentMeta {
  id: string
  name: string
  type: string
  size: number
}

export interface Project {
  id: string
  name: string
  description: string
  emoji: string
  position: number
}

export interface Task {
  id: string
  title: string
  description: string
  projectId: string | null
  dateType: DateType
  date: string | null
  status: Status
  repeat: RepeatKind
  repeatDays: Weekday[]
  parentId: string | null
  important: boolean
  attachments: AttachmentMeta[]
  position: number
  createdAt: number
}

