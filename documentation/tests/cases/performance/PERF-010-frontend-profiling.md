# PERF-010 — [Performance][Frontend] Use the window, then close it -> no JS heap or DOM growth, WebContent returns to its start

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | [`ui/`](../../../../ui/src/App.tsx) — the React app inside the webview |
| Feature | [Hide to tray](../../../docs/features/02-hide-to-tray.md) |

## What we measure and why

The webview is 62% of the idle footprint, and none of the process-level tools can see inside it.
This case checks that using the window does not leave the React app retaining memory, DOM nodes or
network activity. If the window is later destroyed on close, the closed state becomes moot, but the
case still applies while the window is open.

## Setup

Two ways in. The process-level check needs no rebuild; the inspector check needs a temporary
`devtools` build.

For the inspector, add `devtools` temporarily in `src-tauri/Cargo.toml`:

```toml
tauri = { version = "2.11.3", features = ["tray-icon", "image-png", "devtools"] }
```

Rebuild, install, then in Safari enable **Settings → Advanced → Show features for web developers**
and open **Develop → [machine name] → QA Portal Sync**. **Revert the feature before committing** —
it opens an inspector on a production build.

## Procedure

### Process-level, any build

```bash
WC=$(pgrep -f "WebKit.WebContent" | head -1)
for i in $(seq 1 30); do
  echo "$(date +%T)  $(footprint -p $WC | awk '/phys_footprint:/{print $2, $3}')"
  sleep 2
done
```

While it runs: open the window, toggle the switch on and off five times, close the window.

### Inspector, devtools build

| Panel | What to do |
|---|---|
| **Timelines → JavaScript Allocations** | Snapshot, toggle five times, snapshot again |
| **Elements** | Count DOM nodes before and after the toggles |
| **Network** | Leave the window idle for a minute |
| **Console** | Read it after the toggles |

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| WebContent footprint over the interaction | the `footprint` loop | returns within 2 MB of where it started; no staircase |
| JS heap delta between snapshots | JavaScript Allocations | < 1 MB, and not growing on repeat |
| DOM node count | Elements, before vs after | equal |
| Requests at idle | Network panel | 0 |
| Console errors | Console | 0 |

## Latest result

**Deferred.** Moot for the closed state if the webview is destroyed on close
([planned](../../../docs/features/02-hide-to-tray.md#planned-change-destroy-the-window-instead-of-hiding-it));
still applies while the window is open.

## Pitfalls

- `pgrep -f WebKit.WebContent | head -1` may pick Safari's helper. Prefer the PIDs from the
  [process discovery](../../performance/README.md#find-all-four-processes).
- Forgetting to revert `devtools` ships an inspector.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §10 of the pre-catalog performance procedures
