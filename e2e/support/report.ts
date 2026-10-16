/**
 * Failure attachments. When a test fails, its report directory gets the failed step, a screenshot
 * of both sessions (the webview and the whole screen through Appium), the core state snapshot, and
 * the app's log so far. Called from wdio.conf.ts `afterTest`; every part is best-effort, so a
 * missing piece never hides the original failure.
 */
import { browser } from '@wdio/globals'
import fs from 'node:fs'
import path from 'node:path'
import { screenshot as osScreenshot } from './os.ts'
import { REPORT_DIR } from './paths.ts'
import { snapshot } from './state.ts'
import { currentStep } from './step.ts'

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80)

export async function attachFailure(
  specFile: string,
  title: string,
  error: unknown,
  appLog: string | undefined,
  attempt = 1,
) {
  const dir = path.join(REPORT_DIR, 'failures', `${slug(path.basename(specFile))}--${slug(title)}--attempt-${attempt}`)
  fs.mkdirSync(dir, { recursive: true })

  const summary = [
    `test:  ${title}`,
    `attempt: ${attempt}`,
    `spec:  ${specFile}`,
    `step:  ${currentStep() ?? '(not inside a step)'}`,
    `error: ${error instanceof Error ? error.message : String(error)}`,
  ]
  fs.writeFileSync(path.join(dir, 'failure.txt'), `${summary.join('\n')}\n`)

  const attempts: [string, () => Promise<void>][] = [
    ['webview.png', () => browser.saveScreenshot(path.join(dir, 'webview.png')).then(() => {})],
    ['screen.png', () => osScreenshot(path.join(dir, 'screen.png'))],
    ['snapshot.json', async () => fs.writeFileSync(path.join(dir, 'snapshot.json'), JSON.stringify(await snapshot(), null, 2))],
    ['app.log', async () => fs.writeFileSync(path.join(dir, 'app.log'), appLog ?? '(no app log captured)\n')],
  ]
  for (const [name, attempt] of attempts) {
    try {
      await attempt()
    } catch (cause) {
      fs.writeFileSync(path.join(dir, `${name}.unavailable.txt`), `${String(cause)}\n`)
    }
  }
  return dir
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** e2e/report/index.html: every failure with its attachments, flaky passes, and the raw outputs. */
export function writeIndex() {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const failuresDir = path.join(REPORT_DIR, 'failures')
  const failures = fs.existsSync(failuresDir) ? fs.readdirSync(failuresDir).sort() : []
  const flakyFile = path.join(REPORT_DIR, 'flaky.txt')
  const flaky = fs.existsSync(flakyFile) ? fs.readFileSync(flakyFile, 'utf8').trim().split('\n') : []

  const failureHtml = failures
    .map((name) => {
      const dir = path.join(failuresDir, name)
      const summary = fs.readFileSync(path.join(dir, 'failure.txt'), 'utf8')
      const files = fs.readdirSync(dir).filter((f) => f !== 'failure.txt')
      const images = files.filter((f) => f.endsWith('.png'))
      const links = files.map((f) => `<a href="failures/${name}/${f}">${escape(f)}</a>`).join(' · ')
      const imgs = images.map((f) => `<img src="failures/${name}/${f}" alt="${escape(f)}">`).join('')
      return `<section><h2>${escape(name)}</h2><pre>${escape(summary)}</pre><p>${links}</p><div class="shots">${imgs}</div></section>`
    })
    .join('\n')

  const html = `<!doctype html><meta charset="utf-8"><title>e2e report</title>
<style>body{font:14px system-ui;margin:24px;max-width:1100px}pre{background:#f4f4f4;padding:8px;white-space:pre-wrap}
.shots img{max-width:48%;margin:4px;border:1px solid #ccc}h2{font-size:15px}</style>
<h1>e2e report</h1>
<p>${failures.length ? `<strong>${failures.length} failed</strong>` : 'No failures.'}
${flaky.length ? ` · ${flaky.length} passed only on retry (flaky)` : ''}
· <a href="junit/">JUnit XML</a> · <a href="logs/">WebdriverIO and app logs</a> · <a href="appium.log">Appium log</a></p>
${flaky.length ? `<h2>Flaky</h2><pre>${escape(flaky.join('\n'))}</pre>` : ''}
${failureHtml}`
  fs.writeFileSync(path.join(REPORT_DIR, 'index.html'), html)
}
