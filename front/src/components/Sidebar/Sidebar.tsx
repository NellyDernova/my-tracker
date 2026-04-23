import { NavLink, useMatch } from 'react-router-dom'
import type { MouseEvent } from 'react'
import clsx from 'clsx'
import { useProjects, useReorderProjects } from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import styles from './Sidebar.module.scss'

const NAV_ITEMS = [
  { to: '/inbox', label: '📥 Inbox' },
  { to: '/horizons', label: '🎯 Horizons' },
  { to: '/days', label: '📅 Days' },
  { to: '/weeks', label: '🗓 Weeks' },
  { to: '/years', label: '📆 Years' },
  { to: '/calendar', label: '🗒 Calendar' },
]

export function Sidebar() {
  const { data: projects = [] } = useProjects()
  const reorderProjects = useReorderProjects()
  const openProjectModal = useModalStore((s) => s.openProjectModal)

  const projectMatch = useMatch('/project/:id')
  const activeProjectId = projectMatch?.params.id ?? null

  const handleMove = (e: MouseEvent, id: string, dir: -1 | 1) => {
    e.stopPropagation()
    e.preventDefault()
    const idx = projects.findIndex((p) => p.id === id)
    if (idx === -1) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= projects.length) return
    const next = [...projects]
    const [moved] = next.splice(idx, 1)
    next.splice(newIdx, 0, moved)
    reorderProjects.mutate(next.map((p) => p.id))
  }

  return (
    <aside className={styles.sidebar}>
      <button className={styles.logo} type="button">
        ✦ My Tracker
      </button>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(styles.navBtn, isActive && styles.active)
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.projectsSection}>
        <div className={styles.projectsHeader}>
          <span>Projects</span>
          <button
            className={styles.addProjBtn}
            type="button"
            title="Новый проект"
            onClick={() => openProjectModal('new')}
          >
            +
          </button>
        </div>
        <div className={styles.projectsList}>
          {projects.map((p, idx) => (
            <div key={p.id} className={styles.projectRow}>
              <NavLink
                to={`/project/${p.id}`}
                className={clsx(
                  styles.projectItem,
                  activeProjectId === p.id && styles.active,
                )}
              >
                <span className={styles.projectEmoji}>{p.emoji || '📁'}</span>
                <span>{p.name}</span>
              </NavLink>
              <div className={styles.projectArrows}>
                <button
                  type="button"
                  disabled={idx === 0}
                  style={idx === 0 ? { opacity: 0.2 } : undefined}
                  onClick={(e) => handleMove(e, p.id, -1)}
                  title="Выше"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={idx === projects.length - 1}
                  style={idx === projects.length - 1 ? { opacity: 0.2 } : undefined}
                  onClick={(e) => handleMove(e, p.id, +1)}
                  title="Ниже"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.sidebarFooter}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(styles.settingsBtn, isActive && styles.active)
          }
        >
          ⚙ Настройки
        </NavLink>
      </div>
    </aside>
  )
}
