import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AttachmentMeta } from '@/types'

interface AttachmentsState {
  byTaskId: Record<string, AttachmentMeta[]>
}

interface AttachmentsActions {
  getForTask: (taskId: string) => AttachmentMeta[]
  addAttachment: (taskId: string, att: AttachmentMeta) => void
  removeAttachment: (taskId: string, attId: string) => void
  clearForTask: (taskId: string) => void
}

export const useAttachmentsStore = create<
  AttachmentsState & AttachmentsActions
>()(
  persist(
    (set, get) => ({
      byTaskId: {},

      getForTask: (taskId) => get().byTaskId[taskId] ?? [],

      addAttachment: (taskId, att) =>
        set((s) => ({
          byTaskId: {
            ...s.byTaskId,
            [taskId]: [...(s.byTaskId[taskId] ?? []), att],
          },
        })),

      removeAttachment: (taskId, attId) =>
        set((s) => {
          const curr = s.byTaskId[taskId] ?? []
          const next = curr.filter((a) => a.id !== attId)
          const byTaskId = { ...s.byTaskId }
          if (next.length === 0) delete byTaskId[taskId]
          else byTaskId[taskId] = next
          return { byTaskId }
        }),

      clearForTask: (taskId) =>
        set((s) => {
          if (!(taskId in s.byTaskId)) return s
          const byTaskId = { ...s.byTaskId }
          delete byTaskId[taskId]
          return { byTaskId }
        }),
    }),
    {
      name: 'my-tracker-attachments',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ byTaskId: s.byTaskId }),
    },
  ),
)
