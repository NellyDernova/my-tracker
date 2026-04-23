import { create } from 'zustand'

type ProjectModalTarget = string | 'new' | null

interface ModalState {
  taskStack: string[]
  projectModalTarget: ProjectModalTarget

  openTask: (id: string) => void
  openChildTask: (id: string) => void
  goBackToParent: () => void
  closeTask: () => void

  openProjectModal: (target: Exclude<ProjectModalTarget, null>) => void
  closeProjectModal: () => void
}

export const useModalStore = create<ModalState>()((set) => ({
  taskStack: [],
  projectModalTarget: null,

  openTask: (id) => set({ taskStack: [id] }),
  openChildTask: (id) =>
    set((s) => ({ taskStack: [...s.taskStack, id] })),
  goBackToParent: () =>
    set((s) => ({
      taskStack: s.taskStack.length > 0 ? s.taskStack.slice(0, -1) : s.taskStack,
    })),
  closeTask: () => set({ taskStack: [] }),

  openProjectModal: (target) => set({ projectModalTarget: target }),
  closeProjectModal: () => set({ projectModalTarget: null }),
}))
