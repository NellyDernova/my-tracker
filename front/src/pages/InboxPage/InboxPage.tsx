import { useState } from 'react'
import { useCreateTask, useInboxTasks } from '@/lib/queries'
import { TaskCard } from '@/components/TaskCard/TaskCard'
import styles from './InboxPage.module.scss'

export function InboxPage() {
  const inbox = useInboxTasks()
  const createTask = useCreateTask()
  const [value, setValue] = useState('')

  const submit = () => {
    const v = value.trim()
    if (!v) return
    createTask.mutate({ title: v, dateType: 'none' })
    setValue('')
  }

  return (
    <>
      <h1 className="view-title">📥 Inbox</h1>
      <p className="view-subtitle">
        Закидывай сюда идеи — потом разберёшь по проектам и горизонтам
      </p>
      <div className={styles.wrap}>
        <div className={styles.quickAdd}>
          <input
            type="text"
            autoFocus
            placeholder="Что у тебя на уме? Enter для добавления"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </div>
        <div className={styles.list}>
          {inbox.length === 0 && (
            <div className={styles.empty}>Пусто. Добавь первую идею выше ↑</div>
          )}
          {inbox.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      </div>
    </>
  )
}
