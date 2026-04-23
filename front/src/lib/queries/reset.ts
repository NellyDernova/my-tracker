import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resetApi } from '@/lib/api'
import { repository } from '@/lib/repository'
import { useAttachmentsStore } from '@/store/useAttachmentsStore'
import { qk } from './keys'

export function useResetAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => resetApi.all(),
    onSuccess: async () => {
      const atts = useAttachmentsStore.getState().byTaskId
      const ids = Object.values(atts).flat().map((a) => a.id)
      await Promise.all(ids.map((id) => repository.deleteAttachment(id)))
      useAttachmentsStore.setState({ byTaskId: {} })
      qc.setQueryData(qk.projects, [])
      qc.setQueryData(qk.tasks, [])
      void qc.invalidateQueries({ queryKey: qk.projects })
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}
