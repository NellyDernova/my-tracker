import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react'
import clsx from 'clsx'
import styles from './TagDropdown.module.scss'

export interface TagDropdownItem<T> {
  key: T
  label: ReactNode
  selected?: boolean
  onSelect: () => void
}

interface TriggerBag {
  ref: (node: HTMLElement | null) => void
  open: boolean
  triggerProps: Record<string, unknown>
}

interface TagDropdownProps<T> {
  trigger: (bag: TriggerBag) => ReactNode
  items: TagDropdownItem<T>[]
  footer?: ReactNode
  placement?: 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end'
}

export function TagDropdown<T extends string | number>({
  trigger,
  items,
  footer,
  placement = 'bottom-start',
}: TagDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })
  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  return (
    <>
      {trigger({
        ref: refs.setReference,
        open,
        triggerProps: getReferenceProps(),
      })}
      {open && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className={styles.dropdown}
          {...getFloatingProps()}
        >
          {items.map((item) => (
            <button
              key={String(item.key)}
              type="button"
              className={clsx(styles.item, item.selected && styles.selected)}
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
          {footer && (
            <>
              <hr className={styles.divider} />
              {footer}
            </>
          )}
        </div>
      )}
    </>
  )
}

export { styles as tagStyles }
