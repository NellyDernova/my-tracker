import { useEffect } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import styles from './Modal.module.scss'

interface ModalProps {
  open: boolean
  onClose: () => void
  size?: 'default' | 'task' | 'sm'
  children: ReactNode
}

export function Modal({ open, onClose, size = 'default', children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={clsx(
          styles.modal,
          size === 'task' && styles.modalTask,
          size === 'sm' && styles.modalSm,
        )}
      >
        <div className={styles.scroll}>{children}</div>
      </div>
    </div>
  )
}
