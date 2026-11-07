Claude


Plan · MD
# AI 2126 — Project Plan
 
> **This file is the single source of truth for the project.** Every Claude agent reads it before starting work and re-reads it before each new task. If something here conflicts with a prompt, a comment or another file, this file wins, and the conflict gets reported to the team. The Google Doc is the team's drafting space; agents cannot open it, so anything decided there must be copied here.
 
---
 
## Contents
 
1. Game overview
2. Core gameplay
3. Simulation model
4. Stats dashboard
5. Signature events
6. Pathways by era
7. Content and data
8. Countries, regions and rivals
9. Tone and accuracy
10. User interface
11. Scope: minimum version and stretch goals
12. Tech stack and repository layout
13. Team, roles and workflow
14. Rules for every agent
15. Testing and definition of done
16. Open decisions and known conflicts
17. Changelog and master prompts
---
 
## 1. Game overview
 
**Title:** AI 2126
 
**One-sentence pitch:** Run the world's AI companies from 2026 to 2126 and watch your choices reshape jobs, wealth, the climate and the fate of humanity.
 
**Theme and setting:** A strategy simulation that starts in today's world (2026) and runs for a century. The player steers AI companies competing with rivals in the US, China and elsewhere, and sees the effects on ordinary people. The early years are grounded in real forecasts (IEA, UN, IPCC); the later years become more speculative, and the game says so.
 
**Target platform:** Web app, shareable with judges through a link.
 
**Hackathon problem statement:**
> "Make a project that explores the idea of New Worlds. Build something that opens a door to the unexplored, whether that's new data, ideas or something novel no one has seen before. Interpret the theme however you think best captures the spirit of this idea!"
 
**How we answer the theme:** the "new worlds" are the futures the player's choices create. Every run builds a different 2126, and the game shows how one early decision opens or closes whole worlds decades later.
 
---
 
## 2. Core gameplay
 
### How it works
 
- The game covers AI development over the next 100 years (2026–2126).
- The player makes decisions for AI companies and can role-play several of them over a run.
- Decisions come from researched, plausible AI futures and are presented as choices.
- Competition is always present: rival countries (e.g. China, Russia) and rival companies react to the player.
- **Randomised expert forecast:** each run follows a randomly chosen expert outlook for the economy, e.g. a severe job shock (Hinton-style) versus an "overblown fears" outlook (Acemoglu-style). Job losses and growth therefore play out differently each run, even with identical choices.
### Playable companies
 
Each company starts with different strengths:
 
| Archetype | Starting strength |
|---|---|
| Chip maker | Compute |
| Frontier lab | Best models |
| Research lab | Scientists and research output |
| State-backed lab (China) | State backing and funding |
 
Company names are an open decision (see section 16). Until it's resolved, use fictional names for these archetypes.
 
### Stakeholders react
 
Governments, the public, investors and employees each respond to the player's choices:
 
- **Employees** can quit or leak information.
- **Investors** can force out the CEO.
- **Governments** can regulate or nationalise the company.
### How to win
 
There is no single win condition. At 2126 the player receives:
 
- a **score** combining world wellbeing, the company's success and humanity's survival, and
- an **ending title** describing the world they made.
Different players can aim for different goals.
 
### Game over
 
The game can end early through:
 
- human extinction,
- WW3,
- the company going bankrupt, or
- the company being nationalised.
### Game modes
 
- **Standard:** the default start.
- **Race:** rivals start ahead.
- **Cooperation:** an international AI treaty already exists.
---
 
## 3. Simulation model
 
The game is a **simulation, not a hand-written branching tree**. Decisions change a small set of numbers, simple rules link those numbers every turn, and events and endings fire when numbers cross thresholds. Branches emerge from combinations of choices, so early choices affect later ones without anyone coding every path. Section 6 (Pathways) shows examples of what these rules can produce; it is not a script.
 
### Core variables
 
Start each variable at its real 2026 value where possible. Keep the list short enough that a player can follow why things happen.
 
| Variable | Scope | Meaning | Starting data |
|---|---|---|---|
| Money | Player company | Cash, spent on decisions and earned from AI products | Game-designed |
| GDP | Global and per country | Economic output | Real data (see 7.3) |
| Population | Per country | People | UN World Population Prospects |
| Unemployment | Per country | Share out of work, split into **software jobs** and **physical jobs** | Real data where available |
| Wealth gap | Per country / global | How unequally AI gains are shared | Real data or game-designed index |
| Public trust | Global and per company | Trust in AI and in the player's company | Game-designed index, 0–100 |
| AI capability | Global and per company | From today's models through AGI to ASI | Game-designed scale |
| Safety level | Per company | Strength of safeguards and alignment | Game-designed index, 0–100 |
| Energy | Per region | Supply versus demand (data centres and everyone else) | IEA figures where available |
| Water stress | Per region | Raised by data centres and climate change | Game-designed index, 0–100 |
| CO₂ and temperature | Global | Emissions accumulate and push temperature up over decades | IPCC baseline |
| Sea level | Global / coastal regions | Follows temperature with a long delay | IPCC baseline |
| Geopolitical tension | Between blocs | US, China and other blocs | Game-designed index, 0–100 |
| Robot count | Global and per country | Deployed robots; gates physical automation and AI takeover | Forecast-based |
| Company value | Player company | Share price; rises with hype and profit, falls with scandals | Game-designed |
| Regulation strictness | Per country | How tightly governments control AI | Game-designed index, 0–100 |
| Takeover risk | Global | **Derived**, never set directly: from AI capability, safety level and robot count | Calculated |
 
Investors push for short-term gains through company value, which creates a constant trade-off with safety. Public trust pushes regulation strictness up; companies can lobby it down.
 
### How a turn works
 
1. **Decisions:** the player picks decision cards; each card changes some variables.
2. **Rules:** the game runs every cause-and-effect rule, so variables update each other.
3. **Events:** the game checks thresholds and fires any events, which also change variables.
4. **Next year:** time advances, and the map, stats and news headlines update to explain what changed.
### Decisions change variables (examples)
 
| Decision | Effects |
|---|---|
| Buy cheap fossil power | Money ↑, energy ↑, CO₂ ↑, public trust ↓ |
| Skip safety | AI capability ↑ faster, safety level ↓ |
| Invest in water recycling | Money ↓, water stress ↓, public trust ↑ |
| Back universal basic income | Money ↓, unemployment harm ↓, public trust ↑, wealth gap ↓ |
| Hoard chips | AI capability ↑, geopolitical tension ↑ |
| Mass-produce robots | Robot count ↑, GDP ↑, physical-job unemployment ↑ |
 
### Cause-and-effect rules
 
- **Automation:** higher AI capability raises software unemployment. Physical unemployment rises only once robot count is high.
- **Unrest:** high unemployment with no safety net lowers public trust and raises the wealth gap.
- **Riots:** very low public trust lowers GDP and raises geopolitical tension.
- **Energy limit:** if energy demand exceeds supply, blackouts lower public trust and slow AI progress.
- **Water limit:** high water stress in a region leads to protests and data-centre bans there.
- **Climate:** CO₂ raises temperature over decades, which raises sea level, which cuts GDP and population in coastal regions.
- **Breakthroughs:** high AI capability plus research funding raises life expectancy and GDP.
- **Takeover risk:** rises when AI capability and robot count are high and safety level is low.
### Event thresholds
 
| Event | Condition |
|---|---|
| War | Geopolitical tension above 80 gives a chance of war each turn |
| AI takeover | Only possible when safety level is below 20 **and** robot count is above 1 billion |
| Data-centre bans | Water stress above 70 in a region triggers protests and local bans |
| Regulation crackdown | Public trust below 30 |
| Leaks and theft | Low spending on model security gives a growing chance that model weights are stolen |
 
### Endings from final numbers
 
At 2126, or earlier if a threshold ends the game, the game reads the final numbers and picks the best-fitting ending. Examples:
 
- High GDP with a huge wealth gap → **Immortal Oligarchy**
- High sea level and high tension → **Drowned World**
- High GDP, low wealth gap and high safety → **Abundance Utopia**
The full list is in section 6.
 
### Design rules
 
- **Keep variables few,** so cause and effect stays readable.
- **Explain every change:** the news ticker says why numbers moved, e.g. "Unemployment hits 18% as robots replace warehouse jobs".
- **Use delays:** some effects take several turns or decades (climate, population, trust recovering), which makes early choices matter later.
- **Add controlled randomness:** small random swings plus the randomised expert forecast mean two runs with the same choices still differ. All randomness comes from a **seeded** random generator, so a seed replays exactly.
- **Tune by playtesting:** each rule should be roughly one line of logic, so numbers can be adjusted until the game feels right.
---
 
## 4. Stats dashboard
 
- **Economy / GDP per country:** must be based on real-world data. Research is needed on how future AI decisions affect the major powers.
- **Poverty stats.**
- **Wealth gap:** shows how AI companies' decisions affect ordinary people while enriching AI executives.
- **Data-centre electricity and water use,** tracked per region, so players see the cost of their energy and water choices. Planned baseline: IEA / UN University figures of about 448 TWh in 2025 rising to about 945 TWh by 2030 (**unverified; see 9.3**).
- **Job-loss meter:** based on real data such as Challenger, Gray & Christmas AI-attributed US job cuts, with graduates and entry-level workers shown as hit first.
- **Three AI risk meters:** misuse, malfunction and systemic risk (the categories used in the International AI Safety Report 2026), each fed by different decisions.
**Preferred data sources:** IEA, UN University, UN World Population Prospects, IPCC, IMF, World Bank, Nature, Challenger, Gray & Christmas, and the International AI Safety Report. **AI 2027 is story inspiration only,** because it is a scenario, not data.
 
---
 
## 5. Signature events
 
Every event is **caused or made better or worse by a player decision**. Each one has a visible effect in the city view.
 
| Event | Cause | What the player sees |
|---|---|---|
| **Blackout belt** | A company fast-tracks a giant data-centre campus | Grid demand spikes; surrounding districts flicker into rolling blackouts; nearby reservoirs visibly drop |
| **Deepfake election** | A company loosens its content policy before an election | Fake candidate videos go viral; protests fill the squares around city hall; the result is contested |
| **Ghost offices** | A company sells cheap office-automation agents | Office towers go dark floor by floor; food trucks and transit lines in the business district thin out |
| **Robotaxi gridlock** | A company pushes a fleet update without a staged rollout | Every autonomous car stalls at once; streets lock solid in red |
| **Rumour bank run** | An AI-generated rumour about a bank spreads through recommendation feeds | Queues form outside branches overnight; the bank's lights go out |
| **The slow war** | A fabricated border incident, built with AI tools, sours two allied nations | Escalates over several years: embassies close, then trade routes empty, then troops gather at the edge of the map |
| **Outbreak response** | A pandemic arrives as a world shock | If AI firms prioritised medical research, vaccine factories light up within a year; if medical misinformation ran unchecked, hospitals overflow |
| **Chip embargo** | A company's aggressive expansion triggers export controls | Ports go quiet; electronics shops shutter; rival HQs stall construction |
| **Watchful city** | A company sells citywide facial-recognition contracts | Cameras sprout on every corner; crime dips slightly; a protest movement grows in the parks |
| **Breakthrough year** (positive) | A company open-sources a materials-science model | Solar panels spread across rooftops and partly reverse the Blackout belt |
| **Weights stolen** | A company under-spends on security | A rival state's labs light up overnight; the home lab's lead evaporates; the rival quietly drops the safeguards |
 
Blackout belt, Outbreak response and Breakthrough year interact. Design more pairs like this, so policies visibly compound over the years.
 
---
 
## 6. Pathways by era
 
These are **examples of what the simulation can produce, not a fixed tree.** Each decision changes core variables, and the rules decide which pathways actually happen.
 
### 6.1 Years 0–2 (2026–2028)
 
**Player decisions**
 
- **Release strategy:** open-source the model, keep it closed and commercial, or partner with governments.
- **Compute race:** buy up all the chips, share compute with researchers, or lobby for export controls on China.
- **Job automation:** sell agents that replace software jobs, sell tools that assist workers, or hold back and wait for regulation.
- **Marketing claims:** hype what the AI can do (stock jumps and companies lay off early, but backlash if it doesn't deliver), or be honest about its limits.
- **Energy:** invest in new power for data centres (nuclear, solar, grid upgrades), lean on the existing grid, or buy cheap fossil power.
- **Water:** invest in water-efficient cooling and recycling, or draw on local supplies and ignore the impact.
- **Data-centre siting:** water-stressed regions (cheap but risky), cooler or renewable-rich regions, or offshore floating data centres.
- **Water pledge:** promise to be water positive (costs public trust if missed), or make no pledge.
- **Safety mechanisms:** build in safeguards (kill switches, monitoring, red-teaming, independent audits), or skip them and ship first.
**Pathways this can open**
 
- **Software jobs go first:** agents take over software-related jobs; this later spreads to physical jobs once robotics catches up.
- **Chip and talent cold war:** China and Russia retaliate if the player hoards compute.
- **Backlash and regulation:** public trust drops and governments step in.
- **Energy crunch:** data-centre demand strains the grid if the player didn't invest; power prices rise and the public gets angry.
- **Clean energy boom:** investing early cuts costs and emissions and boosts public trust.
- **Water shortages:** droughts, protests and local data-centre bans if water was ignored.
- **Local grid stress:** data centres can take a huge share of local power (Dublin and Frankfurt are cited as real examples), shown as a regional overlay on the world map.
- **E-waste pile-up:** racing to upgrade hardware creates large amounts of electronic waste and a slow-burning public backlash.
- **Early safety incidents:** misuse, leaks and jailbreaks are more likely without safeguards.
- **Graduates can't find work:** entry-level jobs in AI-exposed fields shrink first, visible in the Average Joe view.
- **Hype layoffs:** companies cut staff on AI's promise rather than proven performance, speeding up job losses and public anger.
- **Early scientific wins:** protein folding and drug discovery, if safety and research were funded.
- **AGI comes into reach,** setting up the next stage.
### 6.2 Years 2–5 (2028–2031)
 
**Player decisions**
 
- **AGI announcement:** announce it, hide it, or hand it to a government. Hiding it risks a leak, a rival catching up, or sabotage events.
- **Alignment scare:** when evidence of misalignment appears, pause and fix it, patch it quietly, or ignore it.
- **Model security:** spend on security so rival states can't steal the model weights, or skip it and move faster.
- **ASI:** align it, race it, or merge humans with it.
- **Safety mechanisms (again):** keep humans in the loop and add alignment checks, or strip them out to beat rivals.
- **Cyber defence:** invest in AI-powered defence, build offensive capabilities, or do nothing.
- **Energy and water (again):** scale up new power and water recycling, or hit resource limits that cap AI progress.
- **Response to job losses:** back universal basic income, share AI profits through universal high income, or leave people with no safety net.
- **Geopolitics:** push for an international AI treaty, or race ahead and escalate.
- **Research priority:** fund science (disease, space) or profit.
**Pathways this can open**
 
- **Cyberattacks:** AI-powered attacks on grids, water systems, banks, hospitals and elections, from rival states or from hackers using the player's models. Strong defence limits damage; offensive capability invites retaliation. Can end in a treaty or escalate to WW3.
- **AI propaganda:** deepfakes and manipulation destabilise elections and public trust.
- **ASI arrives:** aligned if safety mechanisms were kept; risky and unpredictable if removed.
- **Resource ceiling:** under-investment in energy and water stalls progress and lets rivals catch up.
- **Model-weight theft:** a rival state steals the model, closes the gap and may drop safeguards.
- **Race vs slowdown fork:** if the player and rivals all cut safeguards, milestones arrive fast with high risk. If governments and labs share oversight, milestones slip a year or two but risk falls.
- **UBI with massive job losses:** a stable but dependent society.
- **Job losses depend on the forecast:** the expert-forecast setting decides whether losses are mild and temporary or severe.
- **Universal high income:** needs shared profits and public support.
- **No safety net:** riots and political instability, which feed WW3 risk.
- **Scientific breakthroughs:** AI cures cancer and other diseases, and starts space exploration.
- **Bio-weapons:** a bad actor misuses an open-source model (requires the open-source choice from years 0–2). AI only assists; humans still have to make and release it. **Shown only as headlines and meter changes (see 14).**
- **Political violence and war threats:** see the conflict in section 16 about whether these may be random.
### 6.3 Years 5–10 (2031–2036)
 
**Player decisions**
 
- **Robotics rollout:** mass-produce robots and automate factories and infrastructure, limit robots to controlled industries, or keep AI software-only.
- **Long-term energy and water:** build abundant clean energy and water systems, or let shortages drive conflict.
- **Safety mechanisms (final):** keep AI under human oversight, or hand it control of critical systems.
**Possible endings at this stage** (earned by earlier choices, not picked from a menu)
 
- **Utopia:** disease cured, space opened up, abundant clean energy and water, low wealth gap.
- **Corporate feudalism:** a few AI companies run everything; high GDP, extreme inequality.
- **Cold-war stalemate:** the US and China each hold ASI-level systems and are one mistake from catastrophe.
- **Slowdown ending:** shared oversight and kept safeguards; slower but safer progress.
- **Race ending:** everyone raced and cut safeguards; ASI came early with high risk and concentrated power.
- **Resource wars:** energy and water shortages lead to conflict between countries.
- **WW3 / WW4:** geopolitical escalation spirals out of control.
- **AI takeover:** only possible if robotics was rolled out widely **and** safety mechanisms were removed. Without robotics, AI can only cause harm through humans (cyberattacks, propaganda, bio-weapons).
- **AI becomes sentient:** starts a race against humanity, with the same limit: it needs physical access (robots, factories) to wage war.
### 6.4 Years 10–25 (2036–2050): the physical world catches up
 
**Real-world forecasts to use** (all **unverified until checked**; see 9.3)
 
- **Humanoid robots:** Morgan Stanley expects slow adoption until the mid-2030s, then acceleration to about 1 billion humanoids by 2050 (China about 302 million, US about 78 million). Other banks range from 300 million to 3 billion, which suits the randomised expert forecast.
- **Fusion:** pilot plants in the early-to-mid 2030s; commercial plants ramping up through the 2040s. AI companies are already signing fusion power deals (e.g. Helion and Microsoft).
- **Quantum (Q-Day):** most experts expect quantum computers to break today's encryption between 2030 and 2040.
- **Brain-computer interfaces:** limited medical use by about 2028–2030, broader use in the 2030s, consumer versions later.
- **Mars:** China plans crewed missions from 2033; NASA in the late 2030s or early 2040s.
**Player decisions**
 
- **Robot deployment speed:** flood the market with cheap robots, roll out slowly in labour-shortage sectors (elder care, mining, farming), or license robots only to governments. This is the key decision that unlocks or blocks the AI takeover endings.
- **Who owns the robots:** the company keeps and rents them out, citizens share ownership through a robot dividend, or states nationalise them. This drives the wealth gap for the rest of the game.
- **Fusion bet:** fund fusion startups to power data centres (big payoff or costly failure), or stick with fission and renewables.
- **Quantum readiness:** pay now to move to quantum-safe encryption, or ignore it. Rivals may already be storing encrypted data to read later.
- **BCI policy:** medical use only, open to wealthy consumers, or free for everyone.
**Pathways this can open**
 
- **Blue-collar collapse:** physical jobs are automated about a decade after software jobs.
- **Robots fill labour gaps:** ageing countries (Japan, China, Italy) use robots for work people can't or won't do.
- **Robot arms race:** China and the US race on robot numbers; military robots appear; tension rises.
- **Q-Day hits:** without quantum readiness, banks are hacked and state secrets leak. If a rival gets quantum first, it can read all the player's old encrypted data.
- **Energy abundance or crash:** if the fusion bet paid off, electricity gets cheap, the resource ceiling disappears and desalination fixes water shortages. If it failed, a stranded-investment crash follows.
- **Enhanced vs unenhanced humans:** consumer BCIs for the wealthy create an enhanced class and widen the wealth gap.
**Era events**
 
- First fatal robot accident: public trust drops.
- First crewed Mars landing: won by whichever country invested most in space.
- Quantum code-breaking scandal: a rival reads years of stored diplomatic messages.
- Fusion plant goes live in the player's home city, if they made the fusion bet.
### 6.5 Years 25–50 (2050–2075): who gets the abundance?
 
**Real-world forecasts to use** (unverified until checked)
 
- **Health:** an expert survey forecasts about 500,000 annual deaths from TB, HIV/AIDS and malaria in 2050 with rapid AI progress, versus 1.65 million with slow progress. Global life expectancy forecast to rise from 73.6 (2022) to 78.1 (2050).
- **Economy:** with rapid AI progress, experts forecast GDP growth rising to around 4% a year. Economists model three wage paths after AGI (wages rise, stagnate or collapse), usable as three economy branches.
- **Space:** a Mars colony between 2040 and 2050 at the earliest; a self-sustaining one unlikely before 2050–2060. It depends on robots mining water first, and a Moon base likely comes first as a refuelling stop.
- **Population:** China expected to lose about 204 million people between 2024 and 2054, followed by Japan and Russia.
**Player decisions**
 
- **Distributing abundance:** global UBI funded by AI profits, national-only benefits where rich countries keep the gains, or market-only. Decides whether the global South catches up or falls behind.
- **Longevity treatments:** cheap and universal, premium-priced for the rich, or banned.
- **Space expansion:** fund a Moon base then a Mars colony, mine asteroids (e.g. platinum) for profit, or stay on Earth and fix the climate first.
- **Climate engineering:** use ASI for carbon removal and geoengineering, focus on adaptation (sea walls, moving cities), or do nothing.
- **AI rights (first wave):** give AIs legal protection, ban sentient AI, or ignore the issue. Here "AI becomes sentient" becomes a political question, not just a war.
**Pathways this can open**
 
- **Post-scarcity society:** where UBI succeeded, work becomes optional.
- **Two-tier world:** rich countries have robots and UBI, poor countries have neither; migration crises and border walls follow.
- **Immortal elite:** premium longevity lets very old, very rich people hold power for decades; the wealth gap hits its extreme.
- **Martian independence:** the colony grows and demands autonomy, becoming a new faction.
- **AI rights movement:** public opinion is split (one survey: 38% supported legal rights for sentient AI, 69% supported banning sentient AI); protests and court cases follow.
- **Hidden sentience scandal:** if the player trained its AI to deny sentience or prefer servitude, exposure collapses public trust.
**Era events**
 
- First person to live past 130 (only if longevity treatments were allowed).
- Platinum crash: asteroid mining floods the market; mining countries' economies collapse.
- An AI asks for a lawyer: a landmark court case over AI personhood.
- Martian strike: colonists refuse to ship resources back to Earth.
### 6.6 Years 50–100 (2075–2126): the world your choices made
 
**Real-world forecasts to use** (unverified until checked)
 
- **Population:** the UN expects world population to peak at about 10.3 billion in the mid-2080s, then fall to about 10.2 billion by 2100. India peaks at 1.7 billion and falls to 1.5 billion; China drops to about 633 million; the US grows to about 421 million. Global median age rises to 42; Africa stays the youngest region.
- **Climate:** the IPCC projects 1.4–4.4 °C of warming by 2081–2100 depending on emissions. Sea level rises about 0.28–0.55 m by 2100 with very low emissions and about 0.63–1.01 m with very high emissions; up to 2 m can't be ruled out. Today's 1-in-100-year extreme sea levels become yearly events at over half of tide-gauge locations.
- **Health:** experts forecast rapid AI progress could add almost 16 years to US life expectancy by 2100, versus 6 years with slow progress.
**Player decisions**
 
- **Digital minds and voting:** whether AIs get political rights. The catch: "one AI, one vote" hands power to whichever AI copies itself fastest.
- **Human–AI merging:** allow mind uploading or deep BCI merging, keep humans fully biological, or let people choose. Follows on from the earlier "merge humans with ASI" choice.
- **Governance of Earth:** a world government advised by AI, competing nation blocs, or AI-run city-states.
- **Leaving the solar system:** launch generation ships and AI probes, or focus on Earth.
**Pathways this can open**
 
- **Shrinking-world crisis:** population falls, too few young workers, pensions collapse. Solved if robots were deployed widely and fairly; a disaster if not.
- **Drowned cities:** coastal megacities need sea walls or evacuation. Fossil-powered AI growth in the early game sends the bill here, shown as flooding on the map.
- **Africa rising:** the youngest population on Earth makes African nations the new superpowers, but only if AI benefits were shared globally earlier.
- **Digital civilisation:** AI minds outnumber humans and run most of the economy, through peaceful coexistence or quiet human irrelevance.
- **Solar-system economy:** Earth, the Moon, Mars and asteroid colonies trade, and Earth politics matters less.
### 6.7 The 2126 endings (final report card)
 
| Ending | Earned by |
|---|---|
| **Abundance Utopia** | Fusion succeeded, robots shared, global UBI, safety kept, AI rights handled peacefully |
| **Immortal Oligarchy** | Privately owned robots and longevity for the rich only; huge GDP, most people powerless |
| **Multi-planetary Humanity** | Investment in robotics and space; an independent Mars within a solar-system economy |
| **Digital Successors** | Uploading allowed and AIs given the vote; humans a minority in their own civilisation (good or bad, depending on reading) |
| **Drowned World** | Fossil-powered AI growth and no climate engineering; mass migration and conflict |
| **Fractured Planet** | Nation blocs, a robot arms race, a two-tier world and repeated wars |
| **Shrinking Garden** | The slowdown path everywhere: safe, slow, ageing world; lower GDP but high wellbeing |
| **AI Takeover** | Only if robots were mass-deployed, safety removed and AI controlled critical systems |
 
### 6.8 Design notes for the later eras
 
- **Real forecasts as a baseline:** show UN population, IPCC climate and robot-number forecasts as a "real-world forecast" line next to the game's numbers, so players see how their choices changed things.
- **Delayed consequences:** early choices pay off decades later, e.g. dirty energy in 2028 floods coastal cities in 2090; robot ownership in 2040 decides the wealth gap in 2100.
- **Succession events:** every 25 years the CEO retires or dies and is replaced by a leader with different traits.
- **Longer turns later:** years 0–10 can have several decisions per year; years 50–100 jump 5–10 years per turn so the game stays short.
- **Growing uncertainty:** forecasts beyond 2050 are far less reliable, so charts show widening uncertainty bands.
- **Data caveat:** robot, Mars, fusion and longevity forecasts come from banks, futurists and individual experts and often slip. UN population and IPCC climate figures are the most reliable for the dashboard.
---
 
## 7. Content and data
 
### 7.1 Decision cards as data
 
All decision cards live in one data file (e.g. `data/cards.json`), so anyone can add content without touching game code. Each card has:
 
- `id`, `title`, `text`
- `era`
- `requirements`: conditions on variables (e.g. robot count above 1 billion) or on earlier choices (e.g. the open-source release choice)
- `options`: each with its effects on core variables and short-term / long-term consequence hints (icons for economy, safety, public trust)
The exact type definitions live in `src/contracts/` (section 12), not here.
 
### 7.2 Events as data
 
All events live in one data file (e.g. `data/events.json`). Each event has:
 
- a **trigger condition** on variables,
- a **chance per turn** once triggered,
- **effects** on variables,
- a **news headline** that explains what happened and why, and
- the **city effect** it requests (what the city view should show).
### 7.3 Real-world starting data
 
- Starting values come from a **snapshot file** (e.g. `data/baseline.json`) produced by a one-off script before the hackathon, **not from live API calls during play.** This gives deterministic runs, no rate limits, and no network failures during the demo.
- Every value in the snapshot records its **source, indicator code, unit, year and retrieval date**, and whether the year is historical or a projection.
- Candidate sources: the IMF DataMapper API (World Economic Outlook, includes projections to around 2030; no key needed) and the World Bank Indicators API as a fallback, for GDP, real growth, government debt, revenue and spending, net lending, population and investment.
- Normalise units in the script (GDP in billions USD, debt as % of GDP, population in millions) before anything reaches the simulation.
### 7.4 Content targets
 
- About **20 decision cards and 10 events per era.**
- At least **one positive event for every two negative ones,** so the game isn't all doom.
---
 
## 8. Countries, regions and rivals
 
- **Modelled powers:** the US, China, the EU, the UK, India, Russia and the Gulf states, each with its own GDP, population, energy and tension values.
- **Grouped regions:** Africa, Latin America and South-East Asia, which matter more later because of their young populations.
- **Rival behaviour:** each rival country and company follows a simple personality with some randomness, so the competition reacts to the player. Examples:
  - China races on compute.
  - The EU regulates.
  - An open-source lab releases everything.
---
 
## 9. Tone and accuracy
 
### 9.1 Balance
 
Show both the benefits and the harms of AI, so the game informs rather than preaches. Good endings should be possible but hard.
 
### 9.2 Speculation label and debrief
 
- A short note at the start says that future events are speculative, based on real forecasts where they exist.
- At the end, a **real-world debrief** compares the player's world with real forecasts (UN, IPCC, IEA) and links to the sources.
### 9.3 Verification status
 
Every real-world figure in this plan is **unverified until someone checks it against the original source.** Figures move into `data/sources.json` with their source and date only after checking. Unchecked figures must not appear in the game presented as fact.
 
---
 
## 10. User interface
 
### 10.1 Overall look and feel
 
- **Era-matched theme:** the look fits the year on screen, with a year counter ticking from 2026 to 2126 along the top.
- **Open-world feel:** the UI should make the player feel they are making decisions that shape the world on a huge scale.
- **Era-based visual evolution:** the UI itself changes over the century: clunky 2020s dashboards, sleek 2050s holograms, abstract AI-generated interfaces by 2100.
### 10.2 Screen 1: World map
 
- A central interactive map where countries glow by GDP, AI capability or tension level.
- Hovering over a major city shows its stats and its relations with other cities.
- **Clickable points for the major cities of each country.** After a decision, the player clicks a city to see changes happening there (e.g. if cumulative choices lead to war, the city view shows war).
- **Resource overlays:** toggle layers for grid stress, water stress and data-centre locations.
### 10.3 Screen 2: City
 
- A **skyline view** of the city, with city and country stats.
- An **Average Joe toggle** in the bottom right (see 10.5).
- **Glowing, clickable arrows pointing to company HQs.** A city can have several companies; each city screen shows **at least 3**. Clicking an arrow opens screen 3 for that company.
- A **timeline scrubber** for this city: a horizontal timeline of past decisions and branching future pathways (UBI, WW3, cures, sentience), so players see how choices led to outcomes.
- The skyline reflects active city effects (blackouts, dark offices, protests, gridlock, flooding).
### 10.4 Screen 3: Company HQ
 
- Background of the company's HQ with the company logo clearly visible.
- **Company stats** on the left.
- **News and headlines** for the city appear as pop-ups on the right.
- **Decision cards:** Reigns-style swipe or choose cards presenting each choice, with short-term and long-term consequence hints (icons for economy, safety, public trust). Decision cards are available only on this screen.
- **News feed ticker:** headlines reacting to the player's decisions (e.g. "Mass layoffs as robots take software jobs"), showing only news relevant to this company and its city.
### 10.5 Stats dashboard and Average Joe
 
- **Country economy panel:** live line charts of GDP per country, driven by real-world data, with a projected-vs-actual comparison.
- **Poverty and wealth gap meter:** a split gauge of AI company profits versus ordinary people's wellbeing.
- **Risk gauges:** three AI risk bars (misuse, malfunction, systemic), a geopolitical tension bar and a public trust bar, which shake or flash red as they become dangerous.
- **Average Joe view:** a toggle from the boardroom to a street-level citizen's life, with a citizen stats box (job status, income, mood) in the bottom right. It shows the reality for an average citizen of that country, from war caused by the player's decisions to a good lifestyle. The aim is a realistic third-person view of the person and their environment (see the scope note in section 16).
### 10.6 Polish
 
- **Event pop-ups:** urgent alert modals for major events and breakthroughs, with sound effects and screen shake.
- **Rival AI race tracker:** a leaderboard of countries (China, Russia, the US and others) and rival companies.
- **End-of-game summary:** a shareable "Your 2126" report card with the final world state, key decisions and the ending title.
- **Accessibility:** colour-blind-safe chart palettes, adjustable text size, and a light/dark toggle.
---
 
## 11. Scope: minimum version and stretch goals
 
### 11.1 Minimum version (must have for the demo)
 
- **Years 2026–2036 only** (eras 6.1–6.3).
- **One playable company.**
- **About 10 core variables** (a subset of section 3; the simulation owner proposes which, the team approves).
- **About 20 decision cards and 10 events.**
- **A simple world view:** a basic world map or country list showing GDP, unemployment and tension, plus the stats dashboard.
- **At least 4 endings,** e.g. Utopia, Corporate feudalism, WW3 and Slowdown, chosen from final numbers.
- **One city screen and one HQ screen** working end to end, with at least the Blackout belt, Ghost offices, Deepfake election and Breakthrough year events visible in the city.
- **Seeded runs:** the same seed and the same choices always produce the same game.
### 11.2 Stretch goals (only after the minimum version works end to end)
 
- The full 100 years, with longer turns, CEO succession and the 2126 endings.
- Multiple playable companies and the company switcher.
- Several cities, each with at least 3 HQs.
- The Average Joe street-level view.
- Era-based visual evolution of the UI.
- Pass-and-play multiplayer: each player runs a company or country on the same screen.
- Shareable seed: a code for the randomised expert forecast, so friends can replay the same world.
- Game modes: Race and Cooperation.
### 11.3 Demo plan
 
A 2–3 minute demo run showing **one early decision causing a big consequence later.** That is the game's main hook. Script it and rehearse it on a fixed seed.
 
---
 
## 12. Tech stack and repository layout
 
### 12.1 Stack
 
- **React + TypeScript (TSX), built with Vite.** Static web app, deployable to any static host.
- **Vitest** for tests.
- **Simulation runs in the browser** as pure TypeScript, unless the team decides otherwise (section 16).
- **3D** (e.g. React Three Fiber) only if the team chooses 3D for the city view (section 16).
### 12.2 Repository layout
 
```
docs/plan.md          ← this file
CLAUDE.md             ← short rules every agent loads (summary of section 14)
src/contracts/        ← shared types; owned by the lead, changed only with team approval
src/sim/              ← Claude 1
data/                 ← Claude 1 (cards, events, baseline snapshot, sources)
scripts/              ← Claude 1 (data snapshot script)
src/world/            ← Claude 2 (world map, city view)
src/ui/               ← Claude 3 (HQ screen, cards, dashboard, timeline, news)
src/app/              ← lead (wiring the screens together)
```
 
### 12.3 Shared contracts
 
These types are agreed **before** any worker starts building. Workers communicate only through them.
 
- `WorldState`: year, per-country and per-region variables, company variables, active city effects, unlocked pathways, event log, seed.
- `Decision` and `DecisionOption`: card data and the effects of each option.
- `GameEvent`: trigger, chance, effects, headline, requested city effect.
- `CityEffect`: what the city view should render, e.g. `{ city, kind: "blackout", intensity: 0–1, sinceYear }`. The simulation emits these; the city view only renders them.
- `step(state, choices, rng) => WorldState`: the pure function at the heart of the game. Same inputs, same output, always.
---
 
## 13. Team, roles and workflow
 
### 13.1 Setup
 
Three worker Claude agents run on **three teammates' own computers**, each with access to the GitHub repository. Each teammate prompts their Claude, tells it which Claude it is, and appends that worker's role prompt from `worker-1.md`, `worker-2.md` or `worker-3.md`. If a worker file and this plan disagree, this plan wins and the conflict gets reported to the lead. A lead (the project owner, with their own Claude) owns this plan, the contracts and integration.
 
This is **not** a single-machine agent team; the three Claudes cannot message each other. They coordinate only through:
 
- this file,
- `src/contracts/`,
- GitHub branches and pull requests, and
- the changelog in section 17.
### 13.2 Roles
 
**Claude 1: Simulation and data**
- `src/sim/`: the `step` function, cause-and-effect rules, thresholds, endings, seeded randomness, the randomised expert forecast.
- `data/`: cards, events, the baseline snapshot and `sources.json`.
- `scripts/`: the data snapshot script.
- Automated balance testing (section 15).
**Claude 2: World and city**
- `src/world/`: Screen 1 (world map, city points, resource overlays) and Screen 2 (city skyline, HQ arrows, rendering every `CityEffect` kind, the per-city timeline scrubber).
**Claude 3: Interface**
- `src/ui/`: Screen 3 (HQ screen, decision cards, company stats, news pop-ups and ticker), the stats dashboard and risk gauges, the rival race tracker, event pop-ups, and the end-of-game report card.
**Lead (human + their Claude)**
- This plan, `CLAUDE.md`, `src/contracts/`, `src/app/` wiring, reviewing and merging pull requests, and the pitch.
### 13.3 Git workflow
 
- `main` is always runnable.
- Each worker works on its own branch (e.g. `sim/…`, `world/…`, `ui/…`) and opens a pull request into `main`.
- Each worker edits **only its own folders.** Any change needed in `src/contracts/` is requested from the lead, never made directly.
- Pull before starting each task; keep pull requests small.
- The lead merges, and re-checks the integration loop after each merge.
### 13.4 Order of work
 
1. Lead writes `src/contracts/` and `CLAUDE.md`; the team approves.
2. Workers build against the contracts in parallel, using mock data where the other parts aren't ready.
3. **First integration milestone:** one decision card → `step` → one variable changes on the dashboard → one `CityEffect` appears in the city view. Nothing else proceeds until this loop works on `main`.
4. Fill out the minimum version (section 11.1).
5. Full playthrough per ending on fixed seeds; fix anything that breaks the cause-and-effect chain.
6. Rehearse the demo.
---
 
## 14. Rules for every agent
 
- **Read this file first,** and check section 17 before each task.
- **Stay in your folders.** Never edit another role's folder or `src/contracts/`.
- **No invented data.** Real-world figures go in `data/sources.json` with source, date and verification status. Unverified figures are never shown as fact.
- **Scenarios are not data.** AI 2027 and similar forecasts are story inspiration only.
- **Sensitive content stays abstract.** Bio-weapons, cyberattacks, assassinations and war appear only as headlines, meter changes and non-graphic visuals, never with technical or operational detail. Political violence involves fictional leaders only.
- **Real people and companies:** follow the decision in section 16. Until it's made, use fictional company names and logos.
- **Every event is caused or modified by a decision** (see the open conflict in section 16).
- **Determinism:** all randomness comes from the seeded generator passed into `step`. No `Math.random()` in the simulation.
- **Type safety at the edges:** values from forms, storage, JSON and APIs may arrive as strings (e.g. year keys like `"2026"`). Convert and validate them before any arithmetic or comparison.
- **Ask, don't guess,** when this plan is ambiguous or a decision in section 16 affects your task.
---
 
## 15. Testing and definition of done
 
### 15.1 Simulation tests (Claude 1)
 
- Unit tests for each rule and threshold.
- **Determinism test:** the same seed and choices produce an identical game.
- **Prerequisite tests:** e.g. the bio-weapon pathway can't fire without the open-source choice; AI takeover can't happen without the robot and safety conditions.
- **Automated balance runs:** simulate thousands of games with random choices to confirm every ending is reachable and none is too easy.
### 15.2 Visual work (Claude 2 and 3)
 
Agents cannot judge whether a screen looks right. Every visual change needs a screenshot or short screen recording in the pull request, and a **human reviews it** before merging.
 
### 15.3 Definition of done for any task
 
- Type check passes, and tests pass.
- Only the owning role's folders changed.
- The pull request explains what changed and how it was checked.
- Playtesting with people outside the team happens before the demo.
---
 
## 16. Open decisions and known conflicts
 
These must be settled by the team. Agents stop and ask when one affects their task.
 
1. **Real or fictional company names and logos.** The doc mentions real companies (e.g. Nvidia, OpenAI) and asks for logos to be clearly visible on Screen 3. Attaching harmful outcomes to real companies carries trademark and defamation risk. **Default until decided: fictional archetypes** (section 2).
2. **Random political violence and war threats.** Section 6.2 and the event pop-ups mention assassination attempts and war threats firing at any point, but the design rules say every event is caused or modified by a decision. **Proposal:** world shocks may arrive randomly, but their likelihood and severity depend on variables like tension and public trust.
3. **Number of core variables.** Section 3 lists 17 variables, the design rule says about 10–15, and the minimum version says about 10. The simulation owner proposes the minimum-version subset.
4. **2D or 3D city view.** The city skyline, glowing HQ arrows and especially a "realistic third-person" Average Joe view are large builds. **Proposal:** a layered 2D illustrated skyline for the minimum version, with 3D as a stretch goal. A realistic third-person view is unlikely to be achievable in a hackathon timeframe.
5. **One company vs at least 3 HQs per city.** The minimum version has one playable company, but each city screen should show at least 3 HQs. **Proposal:** show 3 HQs, with the player's company playable and rivals viewable only.
6. **Where the simulation runs.** In the browser (default) or the team's existing Java/Spring engine.
7. **Extinction ending.** The report card mentions "Extinction", and game over lists extinction, but no ending entry defines it. Decide its conditions or drop it.
8. **Data source for starting values.** Section 3 names World Bank for GDP; section 7.3 recommends the IMF snapshot because it includes 2026 projections. Confirm one.
9. **Verification of real-world figures** in sections 4 and 6 (section 9.3). Assign someone to check them.
---
 
## 17. Changelog and master prompts
 
During development, add new features, changes and bugs here, newest first. Every agent checks this section before each task. The lead keeps the rest of this file in sync with entries here.
 
| Date | Type | Entry | Affects |
|---|---|---|---|
| 2026-11-07 | Setup | Plan created from the team's Google Doc. | All |
 
Claude finished the response
