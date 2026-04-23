import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Project, Task } from '@/types'
import {
  projectsApi,
  type ProjectCreateInput,
  type ProjectUpdateInput,
} from '@/lib/api'
import type { ServerTask } from '@/lib/api'
import { uid } from '@/lib/utils'
import { qk } from './keys'

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: qk.projects,
    queryFn: () => projectsApi.list(),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectCreateInput) => projectsApi.create(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.projects })
      const prev = qc.getQueryData<Project[]>(qk.projects)
      const tempId = `temp:${uid()}`
      const next: Project = {
        id: tempId,
        name: input.name,
        description: input.description ?? '',
        emoji: input.emoji ?? '📁',
        position: input.position ?? (prev?.length ?? 0),
      }
      qc.setQueryData<Project[]>(qk.projects, (old) => [...(old ?? []), next])
      return { prev, tempId }
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.projects, ctx.prev)
    },
    onSuccess: (created, _input, ctx) => {
      qc.setQueryData<Project[]>(qk.projects, (old) =>
        (old ?? []).map((p) => (p.id === ctx?.tempId ? created : p)),
      )
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.projects })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectUpdateInput }) =>
      projectsApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.projects })
      const prev = qc.getQueryData<Project[]>(qk.projects)
      qc.setQueryData<Project[]>(qk.projects, (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.projects, ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.projects })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.projects })
      await qc.cancelQueries({ queryKey: qk.tasks })
      const prevProjects = qc.getQueryData<Project[]>(qk.projects)
      const prevTasks = qc.getQueryData<ServerTask[]>(qk.tasks)
      qc.setQueryData<Project[]>(qk.projects, (old) =>
        (old ?? []).filter((p) => p.id !== id),
      )
      qc.setQueryData<ServerTask[]>(qk.tasks, (old) =>
        (old ?? []).map((t) =>
          t.projectId === id ? { ...t, projectId: null } : t,
        ),
      )
      return { prevProjects, prevTasks }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prevProjects) qc.setQueryData(qk.projects, ctx.prevProjects)
      if (ctx?.prevTasks) qc.setQueryData(qk.tasks, ctx.prevTasks)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.projects })
      void qc.invalidateQueries({ queryKey: qk.tasks })
    },
  })
}

export function useReorderProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => projectsApi.reorder(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: qk.projects })
      const prev = qc.getQueryData<Project[]>(qk.projects)
      const byId = new Map((prev ?? []).map((p) => [p.id, p]))
      const reordered = ids
        .map((id, idx) => {
          const p = byId.get(id)
          return p ? { ...p, position: idx } : null
        })
        .filter((p): p is Project => p !== null)
      qc.setQueryData<Project[]>(qk.projects, reordered)
      return { prev }
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.projects, ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.projects })
    },
  })
}

// Task type is referenced above to keep imports stable for future selectors.
export type { Task }
