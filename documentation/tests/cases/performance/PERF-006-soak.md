# PERF-006 — [Performance][Soak] Hidden for 8 hours -> memory drift within 3%, no helper restarts

| | |
|---|---|
| Status | `manual` |
| Levels | perf |
| Module | `app` plus the three WebKit helpers |
| Feature | [Overview](../../../docs/overview.md) |

## What we measure and why

Memory of all four processes over a night, hidden. The app is meant to run for weeks; a steady
upward slope over 8 hours **blocks the feature** that introduced it. Helper liveness matters as much
as the drift: a helper that dies and is respawned resets its own memory and would hide a climb.

## Setup

- Release bundle installed in `/Applications`, processes discovered:
  [method → Find all four processes](../../performance/README.md#find-all-four-processes).
- Window hidden and settled for five minutes.
- The machine on power, lid open.

Write the sampler to a file, so it survives the shell:

```bash
cat > ~/qa-soak.zsh <<'EOF'
#!/bin/zsh
LOG=$1; CORE=$2; shift 2
HELPERS=("$@")
echo "iso,core_kb,helpers_kb,total_kb,alive" > "$LOG"
while sleep 300; do
  core=$(ps -o rss= -p $CORE 2>/dev/null | tr -d ' ')
  if [[ -z "$core" ]]; then echo "$(date -Iseconds),GONE,,,0" >> "$LOG"; break; fi
  h=0; alive=1
  for p in $HELPERS; do
    r=$(ps -o rss= -p $p 2>/dev/null | tr -d ' ')
    [[ -n "$r" ]] && { h=$((h+r)); alive=$((alive+1)); }
  done
  echo "$(date -Iseconds),$core,$h,$((core+h)),$alive" >> "$LOG"
done
EOF
chmod +x ~/qa-soak.zsh
```

## Procedure

```bash
LOG=~/qa-portal-soak-$(date +%Y%m%d-%H%M).csv

nohup caffeinate -i >/dev/null 2>&1 &
CAFFEINE=$!
nohup ~/qa-soak.zsh "$LOG" $APP_PID $WK_PIDS >/dev/null 2>&1 &
SOAK=$!

echo "log: $LOG"
echo "stop in the morning:  kill $SOAK $CAFFEINE"
```

**Write those PIDs down** — the shell variables may not survive the night. After five minutes,
check the first row landed and `alive` is 4: `sleep 310; cat "$LOG"`.

Mid-soak, sample the stack to see what the core does while idle:

```bash
sample "$APP_PID" 10 -f /tmp/qa-portal-idle.sample.txt
grep -A30 "Call graph" /tmp/qa-portal-idle.sample.txt | head -40
```

In the morning:

```bash
kill $SOAK $CAFFEINE 2>/dev/null

awk -F, 'NR>1 && $2!="GONE" {n++; if(!f){f=$4} l=$4; if($4>m)m=$4; if($5<4)drop++}
  END {printf "samples=%d first=%dKB last=%dKB peak=%dKB drift=%+.2f%% alive-dips=%d\n", \
       n, f, l, m, (l-f)*100/f, drop+0}' "$LOG"
```

## Metrics

| Metric | How it is taken | Target |
|---|---|---|
| Sample count | `samples=` | ≥ 96 (8 h at 5-minute intervals) |
| Drift | `drift=` — last total RSS vs first | within ±3%, and no monotonic climb across the CSV |
| Helper restarts | `alive-dips=` — samples where fewer than 4 processes were alive | 0 |
| Core survived | no `GONE` row in the CSV | yes |

## Latest result

2026-09-20, v0.1.0: **−0.20%** over 9 h / 108 samples — 192 112 → 191 728 KB, peak 192 176, spread
0.23%; **0 helper restarts** — pass.

## Pitfalls

- **Track the PIDs discovered at the start**, not whatever matches `WebKit` at sample time. Open
  Safari overnight and a per-iteration `pgrep` quietly starts logging its helpers too.
- **`caffeinate -i`**, or a laptop idles into sleep within minutes and the sampler sleeps with it.
  Closing the lid still sleeps the machine regardless.
- **`nohup`**, so an accidentally closed Terminal does not take the run with it.
- The figures are RSS — a relative signal inside this run, not a footprint to compare with PERF-003.

## Related

- Method: [performance/README.md](../../performance/README.md)
- Former section: §6 of the pre-catalog performance procedures
