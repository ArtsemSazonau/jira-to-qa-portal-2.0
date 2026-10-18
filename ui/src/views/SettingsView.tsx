/**
 * The Settings tab. Launch at login is real; its state and saving are owned by the shell (App.tsx),
 * which loads it together with the tray state.
 *
 * Every other section is a preview: its fields are editable and save nothing — no IPC call, no
 * config write — and it says so with a "Not wired yet" badge. The fields are uncontrolled on
 * purpose: there is nothing to do with their values until each feature stores them in Rust.
 */
import { useRef, useState, type ReactNode } from 'react'
import { NotWiredBadge, PendingAction } from '../components/NotWired'
import { SAMPLE_SYNC, SAMPLE_TIMESHEET, type TimesheetProject } from '../fixtures/sample-data'
import { formatDateTime } from './format'

export interface LaunchAtLogin {
  enabled: boolean
  disabled: boolean
  onToggle: (next: boolean) => void
}

const DEFAULT_HOURS_PER_DAY = 8
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function PreviewSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="panel preview" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="section-title">
        {title} <NotWiredBadge />
      </h2>
      <div className="fields">{children}</div>
    </section>
  )
}

type FieldType = 'text' | 'email' | 'url' | 'password' | 'number' | 'time'

function Field({
  id,
  label,
  type = 'text',
  placeholder,
  defaultValue,
}: {
  id: string
  label: string
  type?: FieldType
  placeholder?: string
  defaultValue?: string
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        // Secrets: no autofill, and no offer to save them to the keychain from a field that stores
        // nothing.
        autoComplete={type === 'password' ? 'off' : undefined}
        spellCheck={false}
      />
    </div>
  )
}

interface ProjectRow extends TimesheetProject {
  key: number
}

/** The timesheet template: projects with expected hours per day, added and removed freely. */
function ProjectList() {
  const nextKey = useRef(SAMPLE_TIMESHEET.projects.length)
  const [rows, setRows] = useState<ProjectRow[]>(() =>
    SAMPLE_TIMESHEET.projects.map((project, key) => ({ ...project, key })),
  )

  function add() {
    setRows((current) => [...current, { key: nextKey.current++, name: '', hoursPerDay: DEFAULT_HOURS_PER_DAY }])
  }

  function remove(key: number) {
    setRows((current) => current.filter((row) => row.key !== key))
  }

  return (
    <fieldset className="projects">
      <legend>Projects and expected hours per day</legend>
      {rows.length === 0 && <p className="hint">No projects. Add one to build the week.</p>}
      <ul>
        {rows.map((row, index) => (
          <li key={row.key} className="project-row">
            <input
              type="text"
              aria-label={`Project ${index + 1} name`}
              placeholder="Project name"
              defaultValue={row.name}
            />
            <input
              type="number"
              aria-label={`Project ${index + 1} hours per day`}
              min={0}
              max={24}
              step={0.5}
              defaultValue={row.hoursPerDay}
            />
            <button
              type="button"
              className="ghost"
              aria-label={`Remove project ${index + 1}`}
              onClick={() => remove(row.key)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="ghost" onClick={add}>
        Add project
      </button>
    </fieldset>
  )
}

export function SettingsView({ launchAtLogin }: { launchAtLogin: LaunchAtLogin }) {
  return (
    <div className="view">
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
            checked={launchAtLogin.enabled}
            disabled={launchAtLogin.disabled}
            onChange={(event) => launchAtLogin.onToggle(event.currentTarget.checked)}
          />
        </div>
      </section>

      <PreviewSection id="jira" title="Jira">
        <Field id="jira-email" label="Email" type="email" placeholder="name@company.com" />
        <Field id="jira-token" label="API token" type="password" />
        <Field id="jira-cloud-id" label="Cloud ID" />
        <Field id="jira-filter" label="Filter ID or JQL" placeholder="12345 or project = QA" />
        <PendingAction
          id="jira-test"
          label="Test connection"
          reason="The Jira connection is not wired yet."
        />
      </PreviewSection>

      <PreviewSection id="portal" title="QA Portal">
        <Field id="portal-url" label="URL" type="url" placeholder="https://" />
        <Field id="portal-login" label="Login" />
        <Field id="portal-password" label="Password" type="password" />
      </PreviewSection>

      <PreviewSection id="schedule" title="Sync schedule">
        <fieldset className="choice">
          <legend>Run the sync</legend>
          <label>
            <input type="radio" name="schedule-mode" value="interval" defaultChecked /> Every interval
          </label>
          <label>
            <input type="radio" name="schedule-mode" value="cron" /> On a cron schedule
          </label>
        </fieldset>
        <Field id="schedule-interval" label="Interval, minutes" type="number" defaultValue="60" />
        <Field id="schedule-cron" label="Cron expression" placeholder="0 9 * * 1-5" />
        <p className="hint">Next run: {formatDateTime(SAMPLE_SYNC.nextSync!)}</p>
        <label className="check">
          <input type="checkbox" /> Dry run: compute and show the changes, write nothing
        </label>
      </PreviewSection>

      <PreviewSection id="timesheet" title="Timesheet">
        <Field id="tracker-url" label="Tracker URL" type="url" placeholder="https://" />
        <Field id="tracker-login" label="Login" />
        <Field id="tracker-password" label="Password" type="password" />
        <div className="field">
          <label htmlFor="timesheet-day">Submit on</label>
          <select id="timesheet-day" defaultValue="Friday">
            {WEEKDAYS.map((day) => (
              <option key={day}>{day}</option>
            ))}
          </select>
        </div>
        <Field id="timesheet-time" label="At" type="time" defaultValue="17:00" />
        <fieldset className="choice">
          <legend>When the time comes</legend>
          <label>
            <input type="radio" name="timesheet-mode" value="auto" defaultChecked /> Submit automatically
          </label>
          <label>
            <input type="radio" name="timesheet-mode" value="remind" /> Remind me to review and submit
          </label>
        </fieldset>
        <ProjectList />
      </PreviewSection>

      <PreviewSection id="github" title="GitHub">
        <Field id="github-token" label="Token" type="password" />
        <Field id="github-repo" label="Repository" placeholder="owner/name" />
        <Field id="github-workflow" label="Workflow" placeholder="ci.yml" />
      </PreviewSection>
    </div>
  )
}
