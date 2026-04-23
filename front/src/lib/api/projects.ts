import type { Project } from '@/types'
import { api } from './client'

export type ProjectCreateInput = {
  name: string
  description?: string
  emoji?: string
  position?: number
}

export type ProjectUpdateInput = Partial<ProjectCreateInput>

export const projectsApi = {
  list: () => api.get<Project[]>('/api/projects'),
  create: (input: ProjectCreateInput) =>
    api.post<Project>('/api/projects', input),
  update: (id: string, patch: ProjectUpdateInput) =>
    api.patch<Project>(`/api/projects/${id}`, patch),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
  reorder: (ids: string[]) =>
    api.post<Project[]>('/api/projects/reorder', { ids }),
}
