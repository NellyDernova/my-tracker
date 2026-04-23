export const qk = {
  projects: ['projects'] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
}
