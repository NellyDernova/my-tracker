import type { RepeatKind } from '@/types'

export const REPEAT_OPTIONS: { key: RepeatKind; label: string }[] = [
  { key: 'none', label: 'Не повторять' },
  { key: 'daily', label: 'Каждый день' },
  { key: 'weekdays', label: 'По будням (Пн–Пт)' },
  { key: 'weekly', label: 'Раз в неделю (в этот день)' },
  { key: 'custom-weekdays', label: 'По дням недели' },
  { key: 'monthly', label: 'Раз в месяц (в это число)' },
  { key: 'yearly', label: 'Раз в год (в этот день)' },
]

export const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export const WEEKDAY_FULL = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
]
