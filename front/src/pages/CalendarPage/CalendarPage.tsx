import { useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useTasks } from '@/lib/queries'
import { useAppStore } from '@/store/useAppStore'
import { useModalStore } from '@/store/useModalStore'
import { taskOccursOn } from '@/lib/domain/recurrence'
import { taskSorter } from '@/lib/domain/sorting'
import {
  addDays,
  currentMonthKey,
  MONTH_NAMES,
  sameDay,
  startOfWeek,
  ymd,
} from '@/lib/dates'
import styles from './CalendarPage.module.scss'

export function CalendarPage() {
  const tasks = useTasks()
  const calendarMonth = useAppStore((s) => s.calendarMonth)
  const setCalendarMonth = useAppStore((s) => s.setCalendarMonth)
  const openTask = useModalStore((s) => s.openTask)

  useEffect(() => {
    if (!calendarMonth) setCalendarMonth(currentMonthKey())
  }, [calendarMonth, setCalendarMonth])

  const ym = calendarMonth ?? currentMonthKey()
  const [yr, mo] = ym.split('-').map(Number)

  const cells = useMemo(() => {
    const first = new Date(yr, mo - 1, 1)
    const last = new Date(yr, mo, 0)
    const startWk = startOfWeek(first)
    const totalCells =
      Math.ceil(((last.getTime() - startWk.getTime()) / 86400000 + 1) / 7) * 7
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: totalCells }, (_, i) => {
      const d = addDays(startWk, i)
      const isOther = d.getMonth() !== mo - 1
      const isToday = sameDay(d, today)
      const events = tasks
        .filter((t) => !t.parentId && taskOccursOn(t, d))
        .sort(taskSorter)
      return { date: d, isOther, isToday, events }
    })
  }, [yr, mo, tasks])

  const shift = (dir: -1 | 1) => {
    let m = mo + dir
    let y = yr
    if (m === 0) {
      m = 12
      y -= 1
    }
    if (m === 13) {
      m = 1
      y += 1
    }
    setCalendarMonth(`${y}-${String(m).padStart(2, '0')}`)
  }

  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.title}>
          {MONTH_NAMES[mo - 1]} {yr}
        </h1>
        <div className={styles.nav}>
          <button type="button" className={styles.navBtn} onClick={() => shift(-1)}>
            ‹
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setCalendarMonth(currentMonthKey())}
          >
            Сегодня
          </button>
          <button type="button" className={styles.navBtn} onClick={() => shift(1)}>
            ›
          </button>
        </div>
      </div>
      <div className={styles.grid}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((n) => (
          <div key={n} className={styles.dayName}>
            {n}
          </div>
        ))}
        {cells.map((cell) => (
          <div
            key={ymd(cell.date)}
            className={clsx(
              styles.day,
              cell.isOther && styles.other,
              cell.isToday && styles.today,
            )}
          >
            <div className={styles.num}>{cell.date.getDate()}</div>
            {cell.events.map((t) => (
              <button
                key={t.id}
                type="button"
                className={clsx(styles.event, t.status === 'done' && styles.done)}
                title={t.title}
                onClick={() => openTask(t.id)}
              >
                {t.title || '(без названия)'}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
