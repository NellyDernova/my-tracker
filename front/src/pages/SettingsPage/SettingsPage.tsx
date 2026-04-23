import { useProjects, useResetAll, useTasks } from '@/lib/queries'
import { useAppStore } from '@/store/useAppStore'
import { todayISO } from '@/lib/dates'
import styles from './SettingsPage.module.scss'

export function SettingsPage() {
  const { data: projects = [] } = useProjects()
  const tasks = useTasks()
  const calendarMonth = useAppStore((s) => s.calendarMonth)
  const resetAll = useResetAll()

  const handleExport = () => {
    const snapshot = { projects, tasks, calendarMonth }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-tracker-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    if (confirm('Точно удалить ВСЁ? Это нельзя отменить.')) {
      resetAll.mutate()
    }
  }

  return (
    <>
      <h1 className="view-title">⚙ Настройки</h1>
      <p className="view-subtitle">Хранение, бэкапы и интеграции</p>
      <div className={styles.panel}>
        <h3>Хранение данных</h3>
        <p className="hint">
          Задачи и проекты хранятся на бэкенде (SQLite). Вложения файлов — локально
          в браузере (IndexedDB). Регулярно делай резервные копии.
        </p>
        <div className={styles.actionsRow}>
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            Скачать резервную копию
          </button>
        </div>
        <h3>Опасная зона</h3>
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={`btn btn-danger ${styles.danger}`}
            onClick={handleReset}
            disabled={resetAll.isPending}
          >
            Удалить все данные
          </button>
        </div>
      </div>
    </>
  )
}
