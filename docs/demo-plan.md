# Demo plan: "Two Futures" (2:45, visual-first)

AI 2126: **the decade that decides the century** (the game covers 2026-2036).

## Setup (before going on stage)
```
npm run build
npm run preview
```
Chrome, full screen (F11), dark mode, sound on. Open ALL tabs first so the 3D has loaded. `&fps=0` hides the FPS chip.

| Tab | Link |
|---|---|
| 1 Live start | http://localhost:4173/?seed=44&fps=0 |
| 2 After the solar boom (2029) | http://localhost:4173/?seed=44&fps=0&replay=fastTrack,openMaterials,clean&at=2029 |
| 3 What-if, one choice changed (2032) | http://localhost:4173/?seed=44&fps=0&replay=fastTrack,keepMaterials,clean,backUbi,buildSafeguards,treaty&at=2032 |
| 4 War | (worker-1 adds the link to `data/demo.md`; paste it here) |
| 5 Good ending (Abundance Utopia ~69) | http://localhost:4173/?seed=44&fps=0&replay=fastTrack,openMaterials,clean,backUbi,buildSafeguards,treaty,pauseAndFix,fundScience,controlledRobots,humansInLoop,acceptRules&at=end |
| 6 Bad ending | (war link with `&at=end`) |

## Run of show
| Time | Visual beat | Do | Say |
|---|---|---|---|
| 0:00 | Spinning globe | Tab 1, drag the globe slowly | "Every AI company. Every country. Ten years. You run all of them." |
| 0:15 | 3D San Francisco, golden hour | SF pin -> Open | "San Francisco, 2026." |
| 0:25 | Photo boardroom, ClosedAI sign | Your move -> Fast-track the data centre -> End 2026 | "Build fast or build safe? Fast." |
| 0:45 | City goes dark | Alert, then Night: landmark lights go out | "The grid couldn't take it." |
| 1:00 | Street level | Average Joe toggle | "And this is what it means for one person." |
| 1:15 | Solar boom | Tab 2 | "We open-sourced a materials model. Cheap solar saved the grid." |
| 1:35 | Split screen: two futures | Tab 2 left (Win+Left), Tab 3 right (Win+Right); End 2032 on the right | "Same world. One different choice in 2027." |
| 2:00 | War | Tab 4: globe, alert, Average Joe at war | "Let every company race... and this is where it ends." |
| 2:25 | Two endings side by side | Tab 5 left, Tab 6 right | "AI 2126: the decade that decides the century." |

No war link by 8:00? Skip 2:00 and give the split screen 30 s.

## Roles
Speaker, driver (clicks), backup (Win+G recording ready), Q&A (data + tech).

## Before 9:00
- Rehearse twice on the presenting laptop + projector (90% zoom if 1280x720).
- Record the backup run (Win+G).
- Don't quote IMF numbers as fact unless checked (`data/VERIFY.md`).
- Wrong click: reload the tab (5 s).

## Likely questions
- Real data? IMF starting figures; the future is speculative and the game says so.
- Scripted? No: a seeded simulation; the same choices always give the same world.
- Next? The full 100 years, multiplayer.
