import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface Tab {
  id: string
  label: string
  panel: ReactNode
}

/**
 * A WAI-ARIA tab list with automatic activation: arrow keys, Home and End move focus and select at
 * once. Every panel stays mounted and inactive ones are `hidden`, so what the user typed or chose on
 * a tab survives switching away and back.
 *
 * The selection is on-screen state only. It is not persisted anywhere, and a rebuilt page starts on
 * the first tab.
 */
export function Tabs({ tabs, label }: { tabs: readonly Tab[]; label: string }) {
  const [selected, setSelected] = useState(tabs[0].id)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function select(index: number) {
    setSelected(tabs[index].id)
    buttons.current[index]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabs.findIndex((tab) => tab.id === selected)
    const last = tabs.length - 1
    const next = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    select(next)
  }

  return (
    <>
      <div role="tablist" aria-label={label} className="tablist" onKeyDown={onKeyDown}>
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selected
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className="tab"
              onClick={() => setSelected(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== selected}
          className="tabpanel"
        >
          {tab.panel}
        </div>
      ))}
    </>
  )
}
