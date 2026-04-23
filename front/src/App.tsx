import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { InboxPage } from '@/pages/InboxPage/InboxPage'
import { HorizonsPage } from '@/pages/HorizonsPage/HorizonsPage'
import { DaysPage } from '@/pages/DaysPage/DaysPage'
import { WeeksPage } from '@/pages/WeeksPage/WeeksPage'
import { YearsPage } from '@/pages/YearsPage/YearsPage'
import { CalendarPage } from '@/pages/CalendarPage/CalendarPage'
import { ProjectPage } from '@/pages/ProjectPage/ProjectPage'
import { SettingsPage } from '@/pages/SettingsPage/SettingsPage'
import { TaskModal } from '@/components/TaskModal/TaskModal'
import { ProjectModal } from '@/components/ProjectModal/ProjectModal'
import styles from './App.module.scss'

function Layout() {
  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <TaskModal />
      <ProjectModal />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/horizons" replace />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/horizons" element={<HorizonsPage />} />
        <Route path="/days" element={<DaysPage />} />
        <Route path="/weeks" element={<WeeksPage />} />
        <Route path="/years" element={<YearsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/horizons" replace />} />
      </Route>
    </Routes>
  )
}

export default App
