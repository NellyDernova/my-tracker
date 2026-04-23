import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import 'dayjs/locale/ru'

dayjs.extend(isoWeek)
dayjs.extend(customParseFormat)
dayjs.locale('ru')

export { dayjs }

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export const MONTH_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
]

export const DAY_NAMES = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
  'Четверг', 'Пятница', 'Суббота',
]

export const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export function ymd(d: Date | dayjs.Dayjs): string {
  return dayjs(d).format('YYYY-MM-DD')
}

export function parseYmd(s: string | null | undefined): Date | null {
  if (!s) return null
  const parsed = dayjs(s, 'YYYY-MM-DD', true)
  return parsed.isValid() ? parsed.toDate() : null
}

export function todayISO(): string {
  return ymd(new Date())
}

export function addDays(date: Date, n: number): Date {
  return dayjs(date).add(n, 'day').toDate()
}

export function startOfWeek(date: Date): Date {
  return dayjs(date).startOf('isoWeek').toDate()
}

export function endOfWeek(date: Date): Date {
  return dayjs(date).endOf('isoWeek').toDate()
}

export function startOfMonth(date: Date): Date {
  return dayjs(date).startOf('month').toDate()
}

export function endOfMonth(date: Date): Date {
  return dayjs(date).endOf('month').toDate()
}

export function startOfYear(date: Date): Date {
  return dayjs(date).startOf('year').toDate()
}

export function endOfYear(date: Date): Date {
  return dayjs(date).endOf('year').toDate()
}

export function sameDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b)
}

export function isoWeekNum(date: Date): number {
  return dayjs(date).isoWeek()
}

export function formatDateLong(d: Date): string {
  const day = d.getDate()
  const month = MONTH_SHORT[d.getMonth()].toLowerCase()
  return `${day} ${month} ${d.getFullYear()}`
}

export function ymToMonthTitle(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function ymdShort(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

export function currentMonthKey(): string {
  return dayjs().startOf('month').format('YYYY-MM')
}
