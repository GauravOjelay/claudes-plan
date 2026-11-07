# claudes-plan

Hackathon project. Idea, stack and scope are not decided yet.

## Status
- [ ] Pick the idea
- [ ] Pick the stack
- [ ] Fill in the sections below

## Project overview
_TBD: one or two sentences on what we're building._

## Tech stack
_TBD_

## Commands
_TBD: install, run, test, lint._

## Conventions
- Keep commits small and the message clear.
- Prefer the simplest thing that works; this is a hackathon.
- Update this file as decisions are made.

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
