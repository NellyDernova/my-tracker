import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Modal } from '@/components/Modal/Modal'
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from '@/lib/queries'
import { useModalStore } from '@/store/useModalStore'
import { PROJECT_EMOJIS } from '@/constants/emojis'
import styles from './ProjectModal.module.scss'

interface DraftProject {
  name: string
  description: string
  emoji: string
}

const EMPTY_DRAFT: DraftProject = {
  name: '',
  description: '',
  emoji: '🎯',
}

export function ProjectModal() {
  const target = useModalStore((s) => s.projectModalTarget)
  const close = useModalStore((s) => s.closeProjectModal)
  const { data: projects = [] } = useProjects()
  const project =
    target && target !== 'new' ? projects.find((p) => p.id === target) : undefined
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<DraftProject>(EMPTY_DRAFT)

  useEffect(() => {
    if (target === 'new') setDraft(EMPTY_DRAFT)
    else if (project) {
      setDraft({
        name: project.name,
        description: project.description,
        emoji: project.emoji || '📁',
      })
    }
  }, [target, project])

  if (!target) return null

  const isNew = target === 'new'

  const handleSave = async () => {
    const name = draft.name.trim()
    if (!name) {
      alert('Введи название проекта')
      return
    }
    if (isNew) {
      const created = await createProject.mutateAsync({
        name,
        description: draft.description.trim(),
        emoji: draft.emoji,
      })
      close()
      navigate(`/project/${created.id}`)
    } else if (project) {
      updateProject.mutate({
        id: project.id,
        patch: {
          name,
          description: draft.description.trim(),
          emoji: draft.emoji,
        },
      })
      close()
    }
  }

  const handleDelete = () => {
    if (!project) return
    if (!confirm(`Удалить проект «${project.name}»? Задачи проекта останутся без привязки.`)) return
    deleteProject.mutate(project.id)
    close()
    navigate('/horizons')
  }

  return (
    <Modal open={true} onClose={close} size="sm">
      <div className={styles.header}>
        <div className={styles.badge}>{isNew ? 'Новый проект' : 'Проект'}</div>
        <button type="button" className={styles.closeBtn} onClick={close}>
          ✕
        </button>
      </div>
      <div className={styles.emojiRow}>
        <div className={styles.bigEmoji}>{draft.emoji}</div>
        <div className={styles.emojiInputWrap}>
          <input
            type="text"
            maxLength={6}
            placeholder="Любой эмодзи"
            value={draft.emoji}
            onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
          />
          <div className={styles.emojiHint}>
            Подсказка: <kbd>⌃</kbd> + <kbd>⌘</kbd> + <kbd>Space</kbd> — открыть macOS-эмодзи
          </div>
        </div>
      </div>
      <input
        type="text"
        className={styles.nameInput}
        placeholder="Название проекта"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        autoFocus
      />
      <textarea
        className={styles.descInput}
        placeholder="Описание проекта (необязательно)"
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
      />
      <div className={styles.label}>Быстрый выбор</div>
      <div className={styles.emojiPicker}>
        {PROJECT_EMOJIS.map((em) => (
          <button
            key={em}
            type="button"
            className={clsx(styles.emojiButton, draft.emoji === em && styles.selected)}
            onClick={() => setDraft({ ...draft, emoji: em })}
          >
            {em}
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        {!isNew && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Удалить
          </button>
        )}
        <div className={styles.spacer} />
        <button type="button" className="btn btn-ghost" onClick={close}>
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void handleSave()
          }}
        >
          Сохранить
        </button>
      </div>
    </Modal>
  )
}
