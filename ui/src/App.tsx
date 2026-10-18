import { useEffect, useState } from 'react'
import { Tabs } from './components/Tabs'
import {
  getAutostartEnabled,
  getTrayAvailable,
  hideMainWindow,
  setAutostartEnabled,
} from './lib/ipc'
import { GitHubJobsView } from './views/GitHubJobsView'
import { SettingsView } from './views/SettingsView'
import { SyncView } from './views/SyncView'
import { TimesheetView } from './views/TimesheetView'
import './App.css'

type LoadState = 'loading' | 'ready' | 'unavailable'

/**
 * The window's shell: heading, the four tabs, and the notices and hide footer
 * that apply whichever tab is selected.
 *
 * The shell owns the backend load — launch at login and tray availability are
 * read together on mount — and hands the launch-at-login state to the Settings
 * tab. The selected tab is on-screen state only (see components/Tabs.tsx).
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

  const tabs = [
    {
      id: 'settings',
      label: 'Settings',
      panel: (
        <SettingsView
          launchAtLogin={{
            enabled: autostart,
            disabled: loadState !== 'ready' || saving,
            onToggle: (next) => void onToggle(next),
          }}
        />
      ),
    },
    { id: 'sync', label: 'QA Portal sync', panel: <SyncView /> },
    { id: 'timesheet', label: 'Timesheet', panel: <TimesheetView /> },
    { id: 'github', label: 'GitHub jobs', panel: <GitHubJobsView /> },
  ]

  return (
    <main className="app">
      <header>
        <h1>QA Portal Sync</h1>
        <p className="subtitle">
          Keeps running in the menu bar so scheduled syncs can continue.
        </p>
      </header>

      <Tabs tabs={tabs} label="Sections" />

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
