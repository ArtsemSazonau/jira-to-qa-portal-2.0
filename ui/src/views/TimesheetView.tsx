/**
 * The Timesheet tab: the current week's hours per project, built from the template of projects
 * with expected hours per day and submitted once a week. Sample data until time entry exists; `data`
 * is where the IPC result goes when it does.
 *
 * It reads its own data, not what is typed into the Settings tab: those fields save nothing, and
 * sharing unsaved edits between tabs would need state that belongs in Rust.
 */
import { PendingAction, SampleDataNotice } from '../components/NotWired'
import { SAMPLE_TIMESHEET, type TimesheetWeek } from '../fixtures/sample-data'
import { formatDateTime, formatDay, weekdays } from './format'
import { columnTotals, sum } from './totals'

const STATUS_LABEL: Record<TimesheetWeek['status'], string> = { draft: 'Draft', submitted: 'Submitted' }

export function TimesheetView({ data = SAMPLE_TIMESHEET }: { data?: TimesheetWeek }) {
  const days = weekdays(data.weekStart)
  const rows = data.projects.map((project) => days.map(() => project.hoursPerDay))
  const dayTotals = columnTotals(rows, days.length)

  return (
    <div className="view">
      <SampleDataNotice>
        Sample data: time entry is not wired yet, so nothing here comes from or goes to the time
        tracker.
      </SampleDataNotice>

      <section className="panel padded" aria-labelledby="week-title">
        <h2 id="week-title" className="section-title flush">
          Week of {formatDay(days[0])} – {formatDay(days[4])}
        </h2>
        <dl className="facts">
          <div>
            <dt>Status</dt>
            <dd>{STATUS_LABEL[data.status]}</dd>
          </div>
          <div>
            <dt>Next submission</dt>
            <dd>{formatDateTime(data.nextSubmission)}</dd>
          </div>
        </dl>

        {data.projects.length === 0 ? (
          <p className="notice">No projects are configured. Add them under Settings, Timesheet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="table-caption">Hours per project and day</caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  {days.map((day) => (
                    <th key={day.toISOString()} scope="col">
                      {formatDay(day)}
                    </th>
                  ))}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((project, index) => (
                  <tr key={project.name}>
                    <th scope="row">{project.name}</th>
                    {rows[index].map((hours, day) => (
                      <td key={day}>{hours}</td>
                    ))}
                    <td>{sum(rows[index])}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {dayTotals.map((total, day) => (
                    <td key={day}>{total}</td>
                  ))}
                  <td>{sum(dayTotals)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <PendingAction id="timesheet-submit" label="Submit" reason="Time entry is not wired yet." />
      </section>
    </div>
  )
}
