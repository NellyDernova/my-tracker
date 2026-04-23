import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { DateType } from '@/types'
import {
  addDays,
  endOfWeek,
  isoWeekNum,
  MONTH_NAMES,
  MONTH_SHORT,
  parseYmd,
  sameDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  todayISO,
  ymd,
} from '@/lib/dates'
import styles from './DatePickerPopup.module.scss'

export interface DateValue {
  dateType: DateType
  date: string | null
}

interface DatePickerPopupProps {
  open: boolean
  value: DateValue
  onApply: (value: DateValue) => void
  onClose: () => void
}

const TABS: { key: DateType; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'life', label: 'Жизнь' },
]

export function DatePickerPopup({ open, value, onApply, onClose }: DatePickerPopupProps) {
  const [draft, setDraft] = useState<DateValue>(value)
  const init = value.date ? parseYmd(value.date) : new Date()
  const [month, setMonth] = useState(init?.getMonth() ?? new Date().getMonth())
  const [year, setYear] = useState(init?.getFullYear() ?? new Date().getFullYear())

  useEffect(() => {
    if (open) {
      setDraft(value)
      const d = value.date ? parseYmd(value.date) : new Date()
      if (d) {
        setMonth(d.getMonth())
        setYear(d.getFullYear())
      }
    }
  }, [open, value])

  if (!open) return null

  const activeTab: DateType = draft.dateType === 'none' ? 'day' : draft.dateType

  const switchTab = (tab: DateType) => {
    const today = new Date()
    if (tab === 'life') {
      setDraft({ dateType: 'life', date: null })
      return
    }
    if (tab === 'day') {
      setDraft({ dateType: 'day', date: draft.date ?? todayISO() })
      return
    }
    if (tab === 'week') {
      setDraft({ dateType: 'week', date: draft.date ?? ymd(startOfWeek(today)) })
      return
    }
    if (tab === 'month') {
      setDraft({ dateType: 'month', date: draft.date ?? ymd(startOfMonth(today)) })
      return
    }
    if (tab === 'year') {
      setDraft({ dateType: 'year', date: draft.date ?? ymd(startOfYear(today)) })
      return
    }
  }

  const shiftMonth = (n: number) => {
    let m = month + n
    let y = year
    while (m < 0) {
      m += 12
      y -= 1
    }
    while (m > 11) {
      m -= 12
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  const renderCalendar = () => {
    const first = new Date(year, month, 1)
    const wkStart = startOfWeek(first)
    const weeks: Date[] = []
    for (let w = 0; w < 6; w++) weeks.push(addDays(wkStart, w * 7))

    const selDate = draft.date ? parseYmd(draft.date) : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isWeekMode = activeTab === 'week'
    const isDayMode = activeTab === 'day'

    return (
      <>
        <div className={styles.navRow}>
          <button type="button" className={styles.navBtn} onClick={() => setYear(year - 1)}>
            ‹
          </button>
          <span className={styles.navLabel}>{year}</span>
          <button type="button" className={styles.navBtn} onClick={() => setYear(year + 1)}>
            ›
          </button>
        </div>
        <div className={styles.navRow}>
          <button type="button" className={styles.navBtn} onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <span className={styles.navLabel}>{MONTH_NAMES[month]}</span>
          <button type="button" className={styles.navBtn} onClick={() => shiftMonth(1)}>
            ›
          </button>
        </div>
        <div className={styles.calWrap}>
          <div className={styles.weekRail}>
            <div>W</div>
            {weeks.map((wk) => {
              const wn = isoWeekNum(wk)
              const isSel =
                isWeekMode && selDate && sameDay(startOfWeek(selDate), wk)
              return (
                <button
                  key={ymd(wk)}
                  type="button"
                  className={isSel ? 'selected' : undefined}
                  onClick={() =>
                    setDraft({ dateType: 'week', date: ymd(startOfWeek(wk)) })
                  }
                >
                  W{wn}
                </button>
              )
            })}
          </div>
          <div>
            <div className={styles.daysGrid}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((n) => (
                <div key={n} className={styles.dayName}>
                  {n}
                </div>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {weeks.flatMap((wk) =>
                Array.from({ length: 7 }, (_, d) => {
                  const date = addDays(wk, d)
                  const isOther = date.getMonth() !== month
                  const isToday = sameDay(date, today)
                  const selectedDay =
                    isDayMode && selDate && sameDay(date, selDate)
                  const inWeek =
                    isWeekMode &&
                    selDate &&
                    date >= startOfWeek(selDate) &&
                    date <= endOfWeek(selDate)
                  return (
                    <button
                      key={ymd(date)}
                      type="button"
                      className={clsx(
                        styles.dayBtn,
                        isOther && styles.other,
                        isToday && styles.today,
                        selectedDay && styles.selected,
                        inWeek && styles.inWeek,
                      )}
                      onClick={() => {
                        if (isWeekMode) {
                          setDraft({
                            dateType: 'week',
                            date: ymd(startOfWeek(date)),
                          })
                        } else {
                          setDraft({ dateType: 'day', date: ymd(date) })
                        }
                      }}
                    >
                      {date.getDate()}
                    </button>
                  )
                }),
              )}
            </div>
            <div className={styles.quick}>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => {
                  setDraft({ dateType: 'day', date: todayISO() })
                  const t = new Date()
                  setMonth(t.getMonth())
                  setYear(t.getFullYear())
                }}
              >
                Сегодня
              </button>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => {
                  const t = addDays(new Date(), 1)
                  setDraft({ dateType: 'day', date: ymd(t) })
                  setMonth(t.getMonth())
                  setYear(t.getFullYear())
                }}
              >
                Завтра
              </button>
              <button
                type="button"
                className={styles.quickBtn}
                onClick={() => {
                  const t = startOfWeek(new Date())
                  setDraft({ dateType: 'week', date: ymd(t) })
                  setMonth(t.getMonth())
                  setYear(t.getFullYear())
                }}
              >
                Эта неделя
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderMonthsGrid = () => {
    const selDate = draft.date ? parseYmd(draft.date) : null
    return (
      <>
        <div className={styles.navRow}>
          <button type="button" className={styles.navBtn} onClick={() => setYear(year - 1)}>
            ‹
          </button>
          <span className={styles.navLabel}>{year}</span>
          <button type="button" className={styles.navBtn} onClick={() => setYear(year + 1)}>
            ›
          </button>
        </div>
        <div className={styles.grid}>
          {MONTH_SHORT.map((m, idx) => {
            const isSel =
              selDate && selDate.getFullYear() === year && selDate.getMonth() === idx
            return (
              <button
                key={m}
                type="button"
                className={clsx(styles.gridBtn, isSel && styles.selected)}
                onClick={() => {
                  const d = new Date(year, idx, 1)
                  setDraft({ dateType: 'month', date: ymd(d) })
                }}
              >
                {m}
              </button>
            )
          })}
        </div>
      </>
    )
  }

  const renderYearsGrid = () => {
    const selDate = draft.date ? parseYmd(draft.date) : null
    const baseYear = Math.floor(year / 12) * 12
    const years = Array.from({ length: 12 }, (_, i) => baseYear + i)
    return (
      <>
        <div className={styles.navRow}>
          <button type="button" className={styles.navBtn} onClick={() => setYear(year - 12)}>
            ‹
          </button>
          <span className={styles.navLabel}>
            {baseYear}–{baseYear + 11}
          </span>
          <button type="button" className={styles.navBtn} onClick={() => setYear(year + 12)}>
            ›
          </button>
        </div>
        <div className={styles.grid}>
          {years.map((yr) => {
            const isSel = selDate && selDate.getFullYear() === yr
            return (
              <button
                key={yr}
                type="button"
                className={clsx(styles.gridBtn, isSel && styles.selected)}
                onClick={() => {
                  setDraft({ dateType: 'year', date: `${yr}-01-01` })
                  setYear(yr)
                }}
              >
                {yr}
              </button>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.popup}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={clsx(styles.tab, activeTab === t.key && styles.active)}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={styles.body}>
          {activeTab === 'life' && (
            <div className={styles.life}>Цель на всю жизнь — без дедлайна</div>
          )}
          {(activeTab === 'day' || activeTab === 'week') && renderCalendar()}
          {activeTab === 'month' && renderMonthsGrid()}
          {activeTab === 'year' && renderYearsGrid()}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              onApply({ dateType: 'none', date: null })
            }}
          >
            Удалить дату
          </button>
          <div className={styles.spacer} />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApply(draft)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
