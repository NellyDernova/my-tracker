import { api } from './client'

export { api, ApiError } from './client'
export { projectsApi } from './projects'
export type { ProjectCreateInput, ProjectUpdateInput } from './projects'
export { tasksApi } from './tasks'
export type {
  ServerTask,
  TaskCreateInput,
  TaskUpdateInput,
  TaskListQuery,
} from './tasks'

export const resetApi = {
  all: () => api.post<void>('/api/reset'),
}
