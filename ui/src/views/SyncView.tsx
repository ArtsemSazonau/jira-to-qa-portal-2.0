/**
 * The QA Portal sync tab: the state of the Jira -> QA Portal sync, the counts it last wrote, and the
 * report the local LLM will generate. Sample data until the sync exists; `data` is where the IPC
 * result goes when it does.
 */
import { PendingAction, SampleDataNotice } from '../components/NotWired'
import { PLATFORMS } from '../domain/platforms'
import { SEVERITIES } from '../domain/severities'
import { SAMPLE_SYNC, type StepOutcome, type SyncSnapshot, type SyncStatus } from '../fixtures/sample-data'
import { formatDateTime } from './format'
import { columnTotals, delta, formatDelta, sum } from './totals'

const STATUS_LABEL: Record<SyncStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
}

const STEP_MARK: Record<StepOutcome, string> = { done: '✓', failed: '✕', skipped: '–', 'not run': '·' }

const NOT_WIRED = 'The sync is not wired yet.'

function CountsTable({ data }: { data: SyncSnapshot }) {
  const rows = PLATFORMS.map((platform) => SEVERITIES.map((severity) => data.counts[platform.id][severity.id]))
  const totals = columnTotals(rows, SEVERITIES.length)

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="table-caption">Bugs per platform and severity, as last written</caption>
        <thead>
          <tr>
            <th scope="col">Platform</th>
            {SEVERITIES.map((severity) => (
              <th key={severity.id} scope="col">
                {severity.label}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {PLATFORMS.map((platform, index) => (
            <tr key={platform.id}>
              <th scope="row">{platform.label}</th>
              {SEVERITIES.map((severity) => {
                const count = data.counts[platform.id][severity.id]
                const change = formatDelta(delta(count, data.previousCounts?.[platform.id][severity.id]))
                return (
                  <td key={severity.id}>
                    {count}
                    {change && <span className="delta">{change}</span>}
                  </td>
                )
              })}
              <td>{sum(rows[index])}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {totals.map((total, index) => (
              <td key={SEVERITIES[index].id}>{total}</td>
            ))}
            <td>{sum(totals)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function SyncView({ data = SAMPLE_SYNC }: { data?: SyncSnapshot }) {
  return (
    <div className="view">
      <SampleDataNotice>
        Sample data: the sync is not wired yet, so these numbers are not from Jira or the QA Portal.
      </SampleDataNotice>

      <section className="panel padded" aria-labelledby="sync-run-title">
        <h2 id="sync-run-title" className="section-title flush">
          Sync
        </h2>
        <dl className="facts">
          <div>
            <dt>Status</dt>
            <dd>{STATUS_LABEL[data.status]}</dd>
          </div>
          <div>
            <dt>Last sync</dt>
            <dd>
              {data.lastSync
                ? `${formatDateTime(data.lastSync.at)}, ${STATUS_LABEL[data.lastSync.outcome].toLowerCase()}`
                : 'Never'}
            </dd>
          </div>
          <div>
            <dt>Next sync</dt>
            <dd>{data.nextSync ? formatDateTime(data.nextSync) : 'Not scheduled'}</dd>
          </div>
        </dl>
        <div className="actions">
          <PendingAction id="sync-run" label="Run now" reason={NOT_WIRED} />
          <label className="check">
            <input type="checkbox" /> Dry run
          </label>
        </div>
        <h3 className="subheading">Steps of the last run</h3>
        <ol className="steps">
          {data.steps.map(({ step, outcome }) => (
            <li key={step} className={`step ${outcome.replace(' ', '-')}`}>
              <span aria-hidden="true" className="step-mark">
                {STEP_MARK[outcome]}
              </span>
              {step}: {outcome}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel padded" aria-labelledby="sync-counts-title">
        <h2 id="sync-counts-title" className="section-title flush">
          Synced counts
        </h2>
        <CountsTable data={data} />
        {data.skippedTickets > 0 && (
          <p className="notice warning">
            {data.skippedTickets === 1
              ? '1 ticket was skipped because its platform is not recognised.'
              : `${data.skippedTickets} tickets were skipped because their platform is not recognised.`}
          </p>
        )}
      </section>

      <section className="panel padded" aria-labelledby="sync-report-title">
        <h2 id="sync-report-title" className="section-title flush">
          Report
        </h2>
        <div className="field">
          <label htmlFor="report-period">Period</label>
          <select id="report-period" defaultValue="last-week">
            <option value="last-week">Last week</option>
            <option value="last-two-weeks">Last two weeks</option>
            <option value="last-month">Last month</option>
          </select>
        </div>
        <label htmlFor="report-text" className="subheading">
          Report text
        </label>
        <textarea id="report-text" readOnly rows={5} value={data.report} />
        <div className="actions">
          <PendingAction id="report-generate" label="Generate" reason="Report generation is not wired yet." />
          <PendingAction id="report-copy" label="Copy" reason="Copying arrives with report generation." />
        </div>
      </section>
    </div>
  )
}
