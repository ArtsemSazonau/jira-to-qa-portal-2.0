import { useEffect, useState } from 'react'
import {
  getAutostartEnabled,
  getTrayAvailable,
  hideMainWindow,
  setAutostartEnabled,
} from './lib/ipc'
import './App.css'

type LoadState = 'loading' | 'ready' | 'unavailable'

/**
 * The settings panel. One toggle for now; this is where the sync schedule,
 * credentials and platform mappings land as PLAN.md §4 works through the MVP.
 */
function App() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [autostart, setAutostart] = useState(false)
  const [trayAvailable, setTrayAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Read the real registration on mount rather than trusting a stored value —
  // the user can add or remove the login item in System Settings behind the
  // app's back.
  useEffect(() => {
    let cancelled = false

    Promise.all([getAutostartEnabled(), getTrayAvailable()])
      .then(([enabled, hasTray]) => {
        if (cancelled) return
        setAutostart(enabled)
        setTrayAvailable(hasTray)
        setLoadState('ready')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        // Running the frontend outside Tauri (plain `vite dev`) has no backend
        // to answer, so the panel says so instead of showing a dead toggle.
        setError(String(cause))
        setLoadState('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function onToggle(next: boolean) {
    setSaving(true)
    setError(null)
    // Optimistic, then reconciled against what the OS actually did — a failed
    // registration must not leave the toggle claiming something untrue.
    setAutostart(next)
    try {
      await setAutostartEnabled(next)
      setAutostart(await getAutostartEnabled())
    } catch (cause: unknown) {
      setError(String(cause))
      setAutostart(!next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="settings">
      <header>
        <h1>QA Portal Sync</h1>
        <p className="subtitle">
          Keeps running in the menu bar so scheduled syncs can continue.
        </p>
      </header>

      <section className="panel">
        <div className="row">
          <div className="row-text">
            <label htmlFor="autostart">Launch at login</label>
            <p className="hint">
              Start automatically when you log in to macOS, hidden in the menu
              bar.
            </p>
          </div>
          <input
            id="autostart"
            type="checkbox"
            role="switch"
            className="switch"
            checked={autostart}
            disabled={loadState !== 'ready' || saving}
            onChange={(event) => void onToggle(event.currentTarget.checked)}
          />
        </div>
      </section>

      {loadState === 'unavailable' && (
        <p className="notice" role="status">
          The desktop backend is not available. Run the app with{' '}
          <code>npm run tauri dev</code>.
        </p>
      )}

      {error && loadState === 'ready' && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {loadState === 'ready' && !trayAvailable && (
        <p className="notice error" role="alert">
          The menu bar icon could not be created, so closing this window quits
          the app instead of hiding it.
        </p>
      )}

      {loadState === 'ready' && trayAvailable && (
        <footer>
          <button type="button" className="ghost" onClick={() => void hideMainWindow()}>
            Hide to menu bar
          </button>
          <p className="hint">
            Closing this window hides it too. Use Quit in the menu bar icon, or
            ⌘Q, to exit.
          </p>
        </footer>
      )}
    </main>
  )
}

export default App
