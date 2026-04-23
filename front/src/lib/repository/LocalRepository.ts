import { get, set, del } from 'idb-keyval'
import type { Repository } from './Repository'
import type { AttachmentMeta } from '@/types'
import { uid } from '@/lib/utils'

const ATTACHMENT_PREFIX = 'attachment:'

export class LocalRepository implements Repository {
  async saveAttachment(_taskId: string, file: File): Promise<AttachmentMeta> {
    const id = uid()
    await set(ATTACHMENT_PREFIX + id, file)
    return { id, name: file.name, type: file.type, size: file.size }
  }

  async loadAttachmentBlob(id: string): Promise<Blob | null> {
    const val = await get<Blob>(ATTACHMENT_PREFIX + id)
    return val ?? null
  }

  async deleteAttachment(id: string): Promise<void> {
    await del(ATTACHMENT_PREFIX + id)
  }
}
