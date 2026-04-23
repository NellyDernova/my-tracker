import type { Task } from '@/types'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseYmd,
  sameDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from '@/lib/dates'
import { taskSorter } from './sorting'
import { taskOccursOn } from './recurrence'

export type HorizonBucket = 'today' | 'tomorrow' | 'week' | 'month' | 'year' | 'life'

export const HORIZON_ORDER: HorizonBucket[] = [
  'today',
  'tomorrow',
  'week',
  'month',
  'year',
  'life',
]

export const HORIZON_LABEL: Record<HorizonBucket, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  week: 'На неделю',
  month: 'На месяц',
  year: 'На год',
  life: 'Жизнь',
}

function horizonBucket(
  t: Task,
  today: Date,
  tomorrow: Date,
  weekStart: Date,
  weekEnd: Date,
  monthStart: Date,
  monthEnd: Date,
  yearStart: Date,
  yearEnd: Date,
): HorizonBucket | null {
  if (t.dateType === 'life') return 'life'
  if (t.dateType === 'none') return null
  if (!t.date) return null
  const d = parseYmd(t.date)
  if (!d) return null

  if (t.dateType === 'day') {
    if (sameDay(d, today)) return 'today'
    if (sameDay(d, tomorrow)) return 'tomorrow'
    if (d >= weekStart && d <= weekEnd) return 'week'
    if (d >= monthStart && d <= monthEnd) return 'month'
    if (d >= yearStart && d <= yearEnd) return 'year'
    return null
  }
  if (t.dateType === 'week') {
    if (d >= weekStart && d <= weekEnd) return 'week'
    if (d >= monthStart && d <= monthEnd) return 'month'
    if (d >= yearStart && d <= yearEnd) return 'year'
    return null
  }
  if (t.dateType === 'month') {
    if (d >= monthStart && d <= monthEnd) return 'month'
    if (d >= yearStart && d <= yearEnd) return 'year'
    return null
  }
  if (t.dateType === 'year') {
    if (d >= yearStart && d <= yearEnd) return 'year'
    return null
  }
  return null
}

export function bucketizeTasks(tasks: Task[]): Record<HorizonBucket, Task[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = addDays(today, 1)
  const weekStart = startOfWeek(today)
  const weekEnd = endOfWeek(today)
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const yearStart = startOfYear(today)
  const yearEnd = endOfYear(today)

  const buckets: Record<HorizonBucket, Task[]> = {
    today: [],
    tomorrow: [],
    week: [],
    month: [],
    year: [],
    life: [],
  }

  const topLevelTasks = tasks.filter((t) => !t.parentId)

  topLevelTasks.forEach((t) => {
    const bucket = horizonBucket(
      t, today, tomorrow,
      weekStart, weekEnd,
      monthStart, monthEnd,
      yearStart, yearEnd,
    )
    if (bucket) buckets[bucket].push(t)
  })

  const recurringTodayExtra = topLevelTasks.filter((t) => {
    if (t.repeat === 'none' || !t.repeat) return false
    if (t.dateType !== 'day' || !t.date) return false
    if (sameDay(parseYmd(t.date)!, today)) return false
    return taskOccursOn(t, today)
  })
  const recurringTomorrowExtra = topLevelTasks.filter((t) => {
    if (t.repeat === 'none' || !t.repeat) return false
    if (t.dateType !== 'day' || !t.date) return false
    if (sameDay(parseYmd(t.date)!, tomorrow)) return false
    return taskOccursOn(t, tomorrow)
  })

  const existingToday = new Set(buckets.today.map((t) => t.id))
  recurringTodayExtra.forEach((t) => {
    if (!existingToday.has(t.id)) buckets.today.push(t)
  })
  const existingTomorrow = new Set(buckets.tomorrow.map((t) => t.id))
  recurringTomorrowExtra.forEach((t) => {
    if (!existingTomorrow.has(t.id)) buckets.tomorrow.push(t)
  })

  ;(Object.keys(buckets) as HorizonBucket[]).forEach((k) => {
    buckets[k].sort(taskSorter)
  })

  return buckets
}
