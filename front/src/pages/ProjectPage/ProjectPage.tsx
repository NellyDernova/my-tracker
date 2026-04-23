import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DndContext } from '@dnd-kit/core'
import {
  useCreateTask,
  useProjects,
  useTasks,
  useUpdateTask,
} from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import { Column } from '@/components/Column/Column'
import type { ColumnDropContext } from '@/components/Column/Column'
import { handleBoardDragEnd, useBoardSensors } from '@/lib/dnd'
import { taskSorter } from '@/lib/domain/sorting'
import type { Status } from '@/types'
import styles from './ProjectPage.module.scss'

const STATUS_COLUMNS: { status: Status; title: string }[] = [
  { status: 'todo', title: '📝 To Do' },
  { status: 'in-progress', title: '⚡ In Progress' },
  { status: 'done', title: '✅ Done' },
]

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()
  const project = id ? projects.find((p) => p.id === id) : undefined
  const tasks = useTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const openTask = useModalStore((s) => s.openTask)
  const openProjectModal = useModalStore((s) => s.openProjectModal)
  const sensors = useBoardSensors()

  useEffect(() => {
    if (id && !project) navigate('/horizons', { replace: true })
  }, [id, project, navigate])

  const columns = useMemo(() => {
    if (!project) return []
    return STATUS_COLUMNS.map(({ status, title }) => {
      const colTasks = tasks
        .filter((t) => !t.parentId && t.projectId === project.id && t.status === status)
        .sort(taskSorter)
      return {
        id: `project-${project.id}-${status}`,
        title,
        tasks: colTasks,
        ctx: { projectId: project.id, status } as ColumnDropContext,
      }
    })
  }, [tasks, project])

  if (!project) return null

  const handleAddTask = async (ctx: ColumnDropContext) => {
    const t = await createTask.mutateAsync({
      title: '',
      projectId: ctx.projectId ?? null,
      status: ctx.status ?? 'todo',
    })
    openTask(t.id)
  }

  return (
    <>
      <div className={styles.header}>
        <span className={styles.emoji}>{project.emoji || '📁'}</span>
        <h2 className={styles.title}>{project.name}</h2>
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => openProjectModal(project.id)}
        >
          Редактировать
        </button>
      </div>
      {project.description && (
        <div className={styles.description}>{project.description}</div>
      )}
      <DndContext
        sensors={sensors}
        onDragEnd={(e) =>
          handleBoardDragEnd(e, (id, patch) => updateTask.mutate({ id, patch }))
        }
      >
        <div className={styles.kanban}>
          {columns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={col.tasks}
              draggableCards
              addContext={col.ctx}
              dropContext={col.ctx}
              onAddTask={(c) => {
                void handleAddTask(c)
              }}
            />
          ))}
        </div>
      </DndContext>
    </>
  )
}
