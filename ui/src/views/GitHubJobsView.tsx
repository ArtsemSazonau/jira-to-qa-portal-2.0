/**
 * The GitHub jobs tab: choose a branch, release mode, platforms, environment, mode and devices for
 * the project's CI jobs. Branches and devices are sample data until dispatch exists; the selection
 * rules are real and live in `github/selection.ts` — this view only renders them.
 *
 * The selection is component state: kept while the user switches tabs (the panel stays mounted),
 * never persisted, and reset whenever the branch changes.
 */
import { useEffect, useRef, useState } from 'react'
import { PendingAction, SampleDataNotice } from '../components/NotWired'
import { PLATFORMS } from '../domain/platforms'
import { SAMPLE_CI, type CiCatalog } from '../fixtures/sample-data'
import {
  allState,
  initialSelection,
  setRelease,
  summary,
  summaryLabel,
  toggle,
  toggleAll,
  toggleDevice,
  withBranch,
  type AllState,
  type Column,
} from './github/selection'

const COLUMNS: { id: Column; label: string }[] = [
  { id: 'run', label: 'Run' },
  { id: 'prodEnv', label: 'Prod env' },
  { id: 'devMode', label: 'Dev mode' },
]

/** A column's All checkbox. React has no attribute for the mixed state, so it is set on the node. */
function AllCheckbox({ label, state, onToggle }: { label: string; state: AllState; onToggle: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'mixed'
  }, [state])

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={`${label}, all platforms`}
      checked={state === 'on'}
      disabled={state === 'disabled'}
      onChange={onToggle}
    />
  )
}

export function GitHubJobsView({ catalog = SAMPLE_CI }: { catalog?: CiCatalog }) {
  const [selection, setSelection] = useState(() => initialSelection(catalog.defaultBranch))
  const counts = summary(selection)

  return (
    <div className="view">
      <SampleDataNotice>
        Sample data: branches and devices are examples, and starting jobs is not wired yet.
      </SampleDataNotice>

      <section className="panel padded" aria-labelledby="jobs-title">
        <h2 id="jobs-title" className="section-title flush">
          Project CI jobs
        </h2>

        <div className="jobs-options">
          <div className="field">
            <label htmlFor="jobs-branch">Branch</label>
            <select
              id="jobs-branch"
              value={selection.branch}
              onChange={(event) => {
                const next = event.currentTarget.value
                setSelection((current) => withBranch(current, next))
              }}
            >
              {catalog.branches.map((branch) => (
                <option key={branch}>{branch}</option>
              ))}
            </select>
          </div>
          <div className="check-with-hint">
            <label className="check">
              <input
                type="checkbox"
                aria-describedby="jobs-release-hint"
                checked={selection.release}
                onChange={(event) => {
                  const release = event.currentTarget.checked
                  setSelection((current) => setRelease(current, release))
                }}
              />
              Release
            </label>
            <p id="jobs-release-hint" className="hint">
              For all platforms. Android builds go to Play Console instead of a local build.
            </p>
          </div>
        </div>

        <table className="jobs-table">
          <caption className="table-caption">Platforms, environment, mode and target devices</caption>
          <thead>
            <tr>
              <th scope="col">Platform</th>
              {COLUMNS.map((column) => (
                <th key={column.id} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="all-row">
              <th scope="row">All</th>
              {COLUMNS.map((column) => (
                <td key={column.id}>
                  <AllCheckbox
                    label={column.label}
                    state={allState(selection, column.id)}
                    onToggle={() => setSelection((current) => toggleAll(current, column.id))}
                  />
                </td>
              ))}
            </tr>
            {PLATFORMS.map((platform) => {
              const choice = selection.platforms[platform.id]
              return [
                <tr key={platform.id} className="platform-row">
                  <th scope="row">{platform.label}</th>
                  {COLUMNS.map((column) => (
                    <td key={column.id}>
                      <input
                        type="checkbox"
                        aria-label={`${column.label} ${platform.label}`}
                        checked={choice[column.id]}
                        disabled={column.id !== 'run' && !choice.run}
                        onChange={() => setSelection((current) => toggle(current, platform.id, column.id))}
                      />
                    </td>
                  ))}
                </tr>,
                <tr key={`${platform.id}-devices`} className="devices-row">
                  <td colSpan={COLUMNS.length + 1}>
                    <div role="group" aria-label={`${platform.label} devices`} className="chips">
                      {catalog.devices[platform.id].map((device) => {
                        const pressed = choice.devices.includes(device)
                        return (
                          <button
                            key={device}
                            type="button"
                            className="chip"
                            aria-pressed={pressed}
                            disabled={!choice.run}
                            onClick={() => setSelection((current) => toggleDevice(current, platform.id, device))}
                          >
                            <span aria-hidden="true" className="chip-mark">
                              {pressed ? '✓' : '+'}
                            </span>
                            {device}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>,
              ]
            })}
          </tbody>
        </table>

        <PendingAction
          id="jobs-run"
          label={summaryLabel(counts)}
          reason={
            counts.jobs === 0
              ? 'Check Run for at least one platform. Starting jobs is not wired yet.'
              : 'Starting jobs is not wired yet.'
          }
        />
      </section>
    </div>
  )
}
