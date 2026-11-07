#!/usr/bin/env bash
# Runs on every prompt. Output is added to Claude's context.
# Identity comes from .claude/worker-id (contains 1, 2, 3 or "master"); not committed.
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}" || exit 0
ID=$(tr -d '[:space:]' < .claude/worker-id 2>/dev/null)
git fetch -q origin 2>/dev/null || echo "(could not reach GitHub; showing nothing new)"

if [ -z "$ID" ]; then
  echo "TEAM SYNC: no .claude/worker-id file. Ask the user to run: echo 1 > .claude/worker-id (use 1, 2, 3 or master)."
  exit 0
fi

echo "=== TEAM SYNC (you are: $ID) - latest from GitHub ==="
if [ "$ID" = "master" ]; then
  for n in 1 2 3; do
    echo "--- worker-$n status (origin/worker-$n:comms/worker-$n.md) ---"
    git show "origin/worker-$n:comms/worker-$n.md" 2>/dev/null | head -25 || true
    git rev-parse -q --verify "origin/worker-$n" >/dev/null || echo "(worker-$n has not pushed a branch yet)"
  done
  echo "Master: answer questions by editing TASKS.md / DECISIONS.md on main and pushing."
else
  echo "--- TASKS.md: your section ---"
  git show origin/main:TASKS.md 2>/dev/null | awk -v h="## worker-$ID" 'index($0,h)==1 && substr($0,length(h)+1,1) !~ /[0-9]/ {p=1;print;next} /^## /{p=0} p'
  echo "--- DECISIONS.md ---"
  git show origin/main:DECISIONS.md 2>/dev/null
  REFS=$(git ls-tree --name-only origin/main references/ 2>/dev/null | grep -E "references/(worker-$ID|all)-")
  if [ -n "$REFS" ]; then echo "--- Reference images for you (open them with your file-reading tool; read the matching .md notes) ---"; echo "$REFS"; fi
  echo "Follow your task. Update comms/worker-$ID.md and push your branch worker-$ID."
fi
echo "=== END TEAM SYNC ==="
exit 0
