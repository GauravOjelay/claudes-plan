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
| 4 War (2034, tension 90, red alert; open Average Joe for the war street) | http://localhost:4173/?seed=44&fps=0&replay=fastTrack+mvidia:grayChips,keepMaterials+mvidia:sellAll,fossil+mvidia:hoardChips,noNet+mvidia:hype,skipSafety+mvidia:skipSecurity,race+mvidia:stockpile,ignoreWarning+mvidia:openUp,fundScience+mvidia:offence&at=2034 |
| 5 Good ending (Abundance Utopia ~69) | http://localhost:4173/?seed=44&fps=0&replay=fastTrack,openMaterials,clean,backUbi,buildSafeguards,treaty,pauseAndFix,fundScience,controlledRobots,humansInLoop,acceptRules&at=end |
| 6 (none) | Final shot: Tab 5 (Utopia report) on the left, Tab 4 (war, 2034) on the right. |


## The message
A game about the next ten years of AI: a few companies' decisions branch the world into very different futures.
Show it three ways: the card's Now/Later arrows BEFORE the choice, the city AFTER it, and the city TIMELINE that links them.

## Spoken script
1. **Globe (0:00-0:20):** "AI 2126 is a game about the next ten years of AI. A handful of companies make decisions that shape everyone's life: jobs, energy, wealth, even war. Here, you make those decisions and the world reacts. Every choice opens one future and closes another."
2. **Boardroom (0:20-0:45):** "It's 2026. ClosedAI wants a giant data centre: in one year, or slowly over three?" Point at the Now/Later arrows. Fast-track -> End 2026.
3. **City (0:45-1:20):** "Here's what that one decision did. The grid couldn't take it: San Francisco is in rolling blackouts." Night -> lights out. Average Joe: "This is Elena. Her power keeps cutting out, because of a decision made in a boardroom."
4. **Split screen (1:20-2:05):** "Same world, same seed. We change ONE decision in 2027: open-source our materials model, or keep it." Left: solar, no blackout. Right: End 2032, blackout returns. Open the timeline on both: "2027 decision -> 2028 breakthrough -> grid recovers. On the right, no breakthrough. One decision, two worlds."
5. **War (2:05-2:30, if ready):** "Let every company race for power, and this is where it ends."
6. **Endings (2:30-2:45):** "Abundance Utopia, or war. Not luck: a few decisions by a few companies. AI 2126: the decade that decides the century."

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
| 2:25 | Two endings side by side | Tab 5 left, Tab 4 right | "AI 2126: the decade that decides the century." |

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
