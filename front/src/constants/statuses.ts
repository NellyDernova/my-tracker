import type { Status } from '@/types'

export const STATUSES: { key: Status; label: string; emoji: string }[] = [
  { key: 'todo', label: 'To Do', emoji: '📝' },
  { key: 'in-progress', label: 'In Progress', emoji: '⚡' },
  { key: 'done', label: 'Done', emoji: '✅' },
]

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
}

export const STATUS_EMOJI: Record<Status, string> = {
  todo: '📝',
  'in-progress': '⚡',
  done: '✅',
}
