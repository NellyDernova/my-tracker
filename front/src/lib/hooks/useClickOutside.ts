import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (e: MouseEvent | TouchEvent) => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return
    const listener = (e: MouseEvent | TouchEvent) => {
      const el = ref.current
      if (!el || el.contains(e.target as Node)) return
      handler(e)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler, enabled])
}
