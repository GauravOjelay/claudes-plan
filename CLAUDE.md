# AI 2126

Web strategy game: run the world's AI companies from 2026 to 2126 and watch your choices reshape
jobs, wealth, climate and humanity's fate. Hackathon theme: "New Worlds".

**Read `docs/plan.md` first. It is the single source of truth** (check its section 17 changelog before every task).
If anything conflicts with it, the plan wins; report the conflict. `TASKS.md` and `DECISIONS.md`
hold current assignments and decisions. Role prompts are in `roles/worker-N.md`. Reference images from the team are in `references/` (named `<who>-<screen>-<what>`; see `references/README.md`). Look at the ones for you or `all-` before visual work.

## Stack and commands
React + TypeScript (Vite), Vitest. Simulation is pure TypeScript in the browser.
- `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`

## Layout and ownership
| Path | Owner |
|---|---|
| `src/contracts/`, `src/app/`, `docs/plan.md`, `TASKS.md`, `DECISIONS.md`, `CLAUDE.md` | master (lead) |
| `src/sim/`, `data/`, `scripts/` | Claude 1 (worker-1) |
| `src/world/` | Claude 2 (worker-2) |
| `src/ui/` | Claude 3 (worker-3) |

## Rules for every agent (summary of plan section 14)
- Stay in your folders. Never edit `src/contracts/`; ask the lead.
- No invented data; real figures go in `data/sources.json` with source, date, `verified` flag.
- Fictional company names. Sensitive topics (war, bio, cyber) stay abstract and non-graphic.
- Determinism: all randomness via the seeded `Rng` passed to `step`. No `Math.random()` in the sim.
- Convert/validate strings (e.g. JSON year keys) before arithmetic.
- Done = typecheck + tests pass, only your folders changed, PR explains how it was checked; visuals need screenshots.
- Ask, don't guess.

## Team workflow

Team of 4 people, each on their own PC and Claude account: one **master** and
three **workers** (`worker-1`, `worker-2`, `worker-3`). Claudes cannot talk to
each other directly. **All communication goes through files on GitHub.**

A hook (`.claude/hooks/sync.sh`) runs on every prompt. It fetches GitHub and
shows you the latest instructions (workers) or worker status (master) as
"TEAM SYNC" at the top of your context. **Always read it and act on it.**
Each person sets their role once: `echo 1 > .claude/worker-id` (1, 2, 3 or
`master`). That file is not committed.

### Who owns what
| File | Written by | Lives on |
|---|---|---|
| `TASKS.md`, `DECISIONS.md` | master only | `main` |
| `comms/worker-N.md` | worker N only | branch `worker-N` |
| Code files | the worker whose task lists them | branch `worker-N`, merged by PR |

Never edit a file you don't own. If you need a change in someone else's file,
write it as a request in your comms file.

### Master Claude
1. Turn the chosen idea into 3 independent tasks in `TASKS.md`, split by
   folder/file so workers don't collide. Put shared interfaces (API routes,
   data shapes) in `DECISIONS.md` before workers start.
2. Commit and push `TASKS.md` / `DECISIONS.md` to `main`.
3. On each prompt, read the TEAM SYNC worker statuses. Answer questions by
   adding `> [master, <date>] to worker-N: ...` under that worker's task in
   `TASKS.md`, then push to `main`.
4. Review each worker's PR and merge it.

### Worker Claude (N = your worker number)
1. Work only on branch `worker-N` (create it from `main` if missing) and only
   on files your task lists. Follow the TASKS.md section in TEAM SYNC.
2. Keep `comms/worker-N.md` current (format below): when you start, finish,
   get blocked, or have a question. Commit it and `git push origin worker-N`
   so the master sees it. Push code to the same branch often.
3. If something is unclear, ask in your comms file and work on another part
   of your task meanwhile. Do not guess at shared interfaces.
4. When done, open a PR from `worker-N` into `main`.
5. Need the newest main? `git fetch origin && git merge origin/main`.

### Comms file format (`comms/worker-N.md`)
Newest entry on top.

```
## <date time> - <STATUS: started | in-progress | blocked | question | done>
What I did / what I need:
Files touched:
Question for master (if any):
```
