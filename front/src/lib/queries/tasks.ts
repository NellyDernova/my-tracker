import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { AttachmentMeta, Status, Task } from '@/types'
import {
  tasksApi,
  type ServerTask,
  type TaskCreateInput,
  type TaskUpdateInput,
} from '@/lib/api'
import { repository } from '@/lib/repository'
import { useAttachmentsStore } from '@/store/useAttachmentsStore'
import { uid } from '@/lib/utils'
import { qk } from './keys'

const EMPTY_SERVER_TASKS: ServerTask[] = []
const EMPTY_ATTACHMENTS: AttachmentMeta[] = []

function mergeAttachments(
  server: ServerTask[],
  byTaskId: Record<string, AttachmentMeta[]>,
): Task[] {
  return server.map((t) => ({ ...t, attachments: byTaskId[t.id] ?? EMPTY_ATTACHMENTS }))
}

function collectDescendants(tasks: Pick<Task, 'id' | 'parentId'>[], rootId: string): Set<string> {
  const toDelete = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    tasks.forEach((t) => {
      if (t.parentId && toDelete.has(t.parentId) && !toDelete.has(t.id)) {
        toDelete.add(t.id)
        changed = true
      }
    })
  }
  return toDelete
}

function cycleStatus(s: Status): Status {
  if (s === 'todo') return 'in-progress'
  if (s === 'in-progress') return 'done'
  return 'todo'
}

export function useTasksRaw() {
  return useQuery<ServerTask[]>({
    queryKey: qk.tasks,
    queryFn: () => tasksApi.list(),
  })
}

export function useTasks(): Task[] {
  const { data } = useTasksRaw()
  const server = data ?? EMPTY_SERVER_TASKS
  const byTaskId = useAttachmentsStore((s) => s.byTaskId)
  return useMemo(() => mergeAttachments(server, byTaskId), [server, byTaskId])
}

export function useTaskById(id: string | undefined): Task | undefined {
  const tasks = useTasks()
  return useMemo(
    () => (id ? tasks.find((t) => t.id === id) : undefined),
    [tasks, id],
  )
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TaskCreateInput) => tasksApi.create(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.tasks })
      const prev = qc.getQueryData<ServerTask[]>(qk.tasks)
      const tempId = `temp:${uid()}`
      const tempTask: ServerTask = {
        id: tempId,
        title: input.title,
        description: input.description ?? '',
        projectId: input.projectId ?? null,
        parentId: input.parentId ?? null,
        dateType: input.dateType ?? 'none',
        date: input.date ?? null,
        status: input.status ?? 'todo',
        repeat: input.repeat ?? 'none',
        repeatDays: input.repeatDays ?? [],
        important: input.important ?? false,
        position: input.position ?? 0,
        createdAt: Date.now(),
      }
      qc.setQueryData<ServerTask[]>(qk.tasks, (old) => [...(old ?? []), tempTask])
      return { prev, tempId }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev)
    },
    onSuccess: (created, _input, ctx) => {
      qc.setQueryData<ServerTask[]>(qk.tasks, (old) =>
        (old ?? []).map((t) => (t.id === ctx?.tempId ? created : t)),
      )
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdateInput }) =>
      tasksApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks })
      const prev = qc.getQueryData<ServerTask[]>(qk.tasks)
      qc.setQueryData<ServerTask[]>(qk.tasks, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  const clearAttachments = useAttachmentsStore((s) => s.clearForTask)
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.tasks })
      const prev = qc.getQueryData<ServerTask[]>(qk.tasks)
      const toDelete = collectDescendants(prev ?? [], id)
      qc.setQueryData<ServerTask[]>(qk.tasks, (old) =>
        (old ?? []).filter((t) => !toDelete.has(t.id)),
      )
      return { prev, toDelete }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev)
    },
    onSuccess: (_data, _id, ctx) => {
      if (!ctx) return
      const attByTask = useAttachmentsStore.getState().byTaskId
      ctx.toDelete.forEach((taskId) => {
        const atts = attByTask[taskId] ?? []
        atts.forEach((a) => {
          void repository.deleteAttachment(a.id)
        })
        clearAttachments(taskId)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}

export function useReorderTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => tasksApi.reorder(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: qk.tasks })
      const prev = qc.getQueryData<ServerTask[]>(qk.tasks)
      const posById = new Map(ids.map((id, idx) => [id, idx]))
      qc.setQueryData<ServerTask[]>(qk.tasks, (old) =>
        (old ?? []).map((t) =>
          posById.has(t.id) ? { ...t, position: posById.get(t.id)! } : t,
        ),
      )
      return { prev }
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.tasks, ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}

export function useToggleTaskStatus() {
  const qc = useQueryClient()
  const update = useUpdateTask()
  return (id: string) => {
    const tasks = qc.getQueryData<ServerTask[]>(qk.tasks) ?? []
    const t = tasks.find((x) => x.id === id)
    if (!t) return
    update.mutate({ id, patch: { status: cycleStatus(t.status) } })
  }
}

export function useToggleTaskImportant() {
  const qc = useQueryClient()
  const update = useUpdateTask()
  return (id: string) => {
    const tasks = qc.getQueryData<ServerTask[]>(qk.tasks) ?? []
    const t = tasks.find((x) => x.id === id)
    if (!t) return
    update.mutate({ id, patch: { important: !t.important } })
  }
}

export function useAttachFile() {
  const addAttachment = useAttachmentsStore((s) => s.addAttachment)
  return async (taskId: string, file: File): Promise<AttachmentMeta> => {
    const meta = await repository.saveAttachment(taskId, file)
    addAttachment(taskId, meta)
    return meta
  }
}

export function useRemoveAttachment() {
  const removeAttachment = useAttachmentsStore((s) => s.removeAttachment)
  return async (taskId: string, attId: string): Promise<void> => {
    await repository.deleteAttachment(attId)
    removeAttachment(taskId, attId)
  }
}
