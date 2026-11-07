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

Team of 4 people, each running their own Claude Code: one **master** and three
**workers** (`worker-1`, `worker-2`, `worker-3`). Claudes cannot talk to each
other directly. **All communication goes through files in this repo.**

### Who owns what
| File | Written by | Read by |
|---|---|---|
| `TASKS.md` | master only | everyone |
| `DECISIONS.md` | master only | everyone |
| `comms/worker-N.md` | worker N only | master (and anyone) |
| Code files | the worker whose task lists them | everyone |

Never edit a file you don't own. If you need a change in someone else's file,
write it in your `comms/` file as a request.

### Master Claude
1. Turn the chosen idea into 3 independent tasks in `TASKS.md`. Split by
   folder/file so workers don't collide. Define shared interfaces (API routes,
   data shapes) in `DECISIONS.md` before workers start.
2. Push `TASKS.md` and `DECISIONS.md` straight to `main`.
3. Regularly `git pull`, read every `comms/worker-N.md`, and answer questions
   by updating `TASKS.md` / `DECISIONS.md` (add a dated line under the task).
4. Review each worker's PR, then merge to `main`.

### Worker Claude (N = your worker number)
1. Start of every session: `git pull origin main`, then read `TASKS.md`,
   `DECISIONS.md` and your section of `TASKS.md`.
2. Work only on branch `worker-N`, only on the files your task lists.
3. Report in `comms/worker-N.md` using the format below. Update it when you
   start, finish, get blocked, or have a question.
4. `comms/worker-N.md` is the ONLY file you may push straight to `main`
   (run `git pull --rebase origin main` first). Everything else goes via PR
   from `worker-N`.
5. If something in `TASKS.md` is unclear, ask in your comms file and work on
   another part of your task while you wait. Do not guess at shared interfaces.

### Comms file format (`comms/worker-N.md`)
Newest entry on top.

```
## <date time> - <STATUS: started | in-progress | blocked | question | done>
What I did / what I need:
Files touched:
Question for master (if any):
```

### Master replies
Master answers by adding a line under the relevant task in `TASKS.md`:
`> [master, <date>] answer to worker-N: ...`
Workers must re-read `TASKS.md` after each `git pull`.

### Humans
The people drive their own Claude. To check for replies, tell your Claude:
"pull and check TASKS.md and DECISIONS.md for updates" (workers) or
"pull and review all comms files" (master).
