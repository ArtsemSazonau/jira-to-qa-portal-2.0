/**
 * How the window marks what is not built yet. Always in words: a muted colour alone would not tell a
 * screen-reader user, or anyone glancing at it, that a field saves nothing.
 */
import type { ReactNode } from 'react'

/** The badge in a preview section's heading. */
export function NotWiredBadge() {
  return <span className="badge">Not wired yet</span>
}

/** The notice at the top of a tab that shows sample data. */
export function SampleDataNotice({ children }: { children: ReactNode }) {
  return <p className="notice sample">{children}</p>
}

/**
 * A button for an action that does not exist yet: disabled, with the reason as its description so
 * a screen reader reads it along with the button.
 */
export function PendingAction({ id, label, reason }: { id: string; label: string; reason: string }) {
  return (
    <div className="pending-action">
      <button type="button" className="ghost" disabled aria-describedby={`${id}-reason`}>
        {label}
      </button>
      <p id={`${id}-reason`} className="hint">
        {reason}
      </p>
    </div>
  )
}
