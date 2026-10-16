# Shared step runner for the scripts/test/*.sh stages. Source it, then call run_steps.
#
#   run_steps "<stage>" \
#     "cargo test::cd src-tauri && cargo test" \
#     "vitest::npm --prefix ui test"
#
# Each argument is "<step name>::<shell command>". Steps run in order from the repo root, each in its
# own `bash -euo pipefail -c`, so a failure inside a compound command still fails the step. The first
# failing step stops the stage: it is named, the steps after it are reported as not run, and the
# stage exits with that step's status.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -t 1 ]]; then
  _bold=$'\e[1m'; _red=$'\e[31m'; _green=$'\e[32m'; _dim=$'\e[2m'; _reset=$'\e[0m'
else
  _bold=''; _red=''; _green=''; _dim=''; _reset=''
fi

_fmt_secs() { printf '%dm%02ds' $(($1 / 60)) $(($1 % 60)); }

run_steps() {
  local stage=$1
  shift
  local -a names=() commands=() results=() times=()
  local spec
  for spec in "$@"; do
    names+=("${spec%%::*}")
    commands+=("${spec#*::}")
  done

  local total=${#names[@]} i failed=-1 rc=0 started=$SECONDS
  for ((i = 0; i < total; i++)); do
    printf '\n%s━━ %s · step %d/%d: %s ━━%s\n' "$_bold" "$stage" $((i + 1)) "$total" "${names[i]}" "$_reset"
    printf '%s$ %s%s\n' "$_dim" "${commands[i]}" "$_reset"
    local t0=$SECONDS
    if (cd "$REPO_ROOT" && bash -euo pipefail -c "${commands[i]}"); then
      results[i]=passed
    else
      rc=$?
      results[i]=FAILED
      failed=$i
    fi
    times[i]=$((SECONDS - t0))
    [[ $failed -ge 0 ]] && break
  done

  printf '\n%s━━ %s summary ━━%s\n' "$_bold" "$stage" "$_reset"
  for ((i = 0; i < total; i++)); do
    case "${results[i]:-not run}" in
      passed) printf '  %s✓%s %-28s %s\n' "$_green" "$_reset" "${names[i]}" "$(_fmt_secs "${times[i]}")" ;;
      FAILED) printf '  %s✗ %-28s %s%s\n' "$_red" "${names[i]}" "$(_fmt_secs "${times[i]}")" "$_reset" ;;
      *) printf '  %s- %-28s not run%s\n' "$_dim" "${names[i]}" "$_reset" ;;
    esac
  done
  printf '  total %s\n' "$(_fmt_secs $((SECONDS - started)))"

  if [[ $failed -ge 0 ]]; then
    printf '\n%s%s failed at step: %s%s\n' "$_red$_bold" "$stage" "${names[failed]}" "$_reset"
    return "$rc"
  fi
  printf '\n%s%s passed%s\n' "$_green$_bold" "$stage" "$_reset"
}
