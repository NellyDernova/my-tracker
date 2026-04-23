import { useEffect, useRef } from 'react'

const IGNORE_SELECTOR = '.task-card, button, input, select, textarea, a'

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let isDown = false
    let startX = 0
    let scrollLeft = 0

    const onDown = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest(IGNORE_SELECTOR)) return
      isDown = true
      el.classList.add('grabbing')
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
    }
    const stop = () => {
      isDown = false
      el.classList.remove('grabbing')
    }
    const onMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      el.scrollLeft = scrollLeft - (x - startX)
    }
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (e.shiftKey || e.deltaX === 0) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('mouseleave', stop)
    el.addEventListener('mouseup', stop)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mouseleave', stop)
      el.removeEventListener('mouseup', stop)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return ref
}
