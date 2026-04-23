import type { Task } from '@/types'
import { parseYmd, sameDay } from '@/lib/dates'

export function taskOccursOn(task: Task, date: Date): boolean {
  if (task.dateType === 'none' || task.dateType === 'life') return false
  if (!task.date) return false
  const taskDate = parseYmd(task.date)
  if (!taskDate) return false
  if (task.dateType !== 'day') return false

  if (sameDay(taskDate, date)) return true
  if (date < taskDate) return false

  const r = task.repeat
  if (!r || r === 'none') return false
  if (r === 'daily') return true
  if (r === 'weekdays') {
    const d = date.getDay()
    return d >= 1 && d <= 5
  }
  if (r === 'weekly') return date.getDay() === taskDate.getDay()
  if (r === 'custom-weekdays') return (task.repeatDays || []).includes(date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)
  if (r === 'monthly') return date.getDate() === taskDate.getDate()
  if (r === 'yearly') {
    return date.getDate() === taskDate.getDate() && date.getMonth() === taskDate.getMonth()
  }
  return false
}
