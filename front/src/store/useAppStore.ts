import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppState {
  calendarMonth: string | null
}

interface AppActions {
  setCalendarMonth: (ym: string | null) => void
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      calendarMonth: null,
      setCalendarMonth: (ym) => set({ calendarMonth: ym }),
    }),
    {
      name: 'my-tracker-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ calendarMonth: s.calendarMonth }),
    },
  ),
)
