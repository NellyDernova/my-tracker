import type { AttachmentMeta } from '@/types'

export interface Repository {
  saveAttachment(taskId: string, file: File): Promise<AttachmentMeta>
  loadAttachmentBlob(id: string): Promise<Blob | null>
  deleteAttachment(id: string): Promise<void>
}
