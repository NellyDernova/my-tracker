import { useEffect, useState } from 'react'
import type { AttachmentMeta } from '@/types'
import { repository } from '@/lib/repository'
import { formatSize } from '@/lib/utils'
import styles from './TaskModal.module.scss'

interface AttachmentLinkProps {
  attachment: AttachmentMeta
  onDelete: () => void
}

export function AttachmentLink({ attachment, onDelete }: AttachmentLinkProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let currentUrl: string | null = null
    repository.loadAttachmentBlob(attachment.id).then((blob) => {
      if (cancelled || !blob) return
      currentUrl = URL.createObjectURL(blob)
      setUrl(currentUrl)
    })
    return () => {
      cancelled = true
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [attachment.id])

  return (
    <div className={styles.attachment}>
      {url ? (
        <a
          href={url}
          download={attachment.name}
          className={styles.attachmentLink}
        >
          📎 {attachment.name}
        </a>
      ) : (
        <span className={styles.attachmentLink}>📎 {attachment.name}</span>
      )}
      <span className={styles.attachmentSize}>{formatSize(attachment.size)}</span>
      <button
        type="button"
        className={styles.attachmentDelete}
        onClick={onDelete}
        title="Удалить"
      >
        ✕
      </button>
    </div>
  )
}
