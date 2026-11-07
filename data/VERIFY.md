# Verification checklist for real-world figures (plan 9.3)

Every real-world number the game can show comes from the IMF DataMapper snapshot in `data/baseline.json`; the provenance of each one is in `data/sources.json`. All of them are marked `"verified": false`. **Nothing here may be presented as fact until a human has ticked it off.** About 10 minutes.

- **Source:** IMF DataMapper, World Economic Outlook (October 2026) (data last modified 2026-10-08 14:43:33). Retrieved 2026-11-07. Year checked: **2026**. 2026 is a projection or estimate, not an observed value (the `projection` flag in `sources.json`).
- **Tolerance:** the IMF revises its figures. A difference under 1% (or under 0.1 percentage points for unemployment) is fine; note any bigger difference and tell the sim owner. If you tick a figure, set `"verified": true` for that entry in `data/sources.json`. **Do not re-run `node scripts/snapshot.ts` afterwards:** it rewrites the file and resets every flag to false.
- **How to look a figure up:** open the link in a normal browser (the IMF site blocks scripts, not people). The "API" link returns the raw numbers for exactly the countries we used, for all years; find `"2026"`. The "Page" link is the IMF's chart page for the same series (use the table view, year 2026).
- **What the game does NOT claim:** the CO2, temperature, robot count and all 0-100 indices (trust, safety, wealth gap, regulation, tension, water stress) are game-designed starting values, not real-world data, and are labelled that way in `src/sim/defaults.ts`. The report-card debrief (`src/ui/ReportCard.tsx`) quotes no figures, only three source links, listed at the end.

## Part 1 - single countries (15 figures, direct comparison, about 5 minutes)

| ✓ | Region | Figure | Game value | Unit | IMF indicator | API link | Page link |
|---|---|---|---|---|---|---|---|
| ☐ | United States (`US`) | GDP, 2026 | **32642.373** | Billions of U.S. dollars | `NGDPD` | [www.imf.org…/NGDPD/USA](https://www.imf.org/external/datamapper/api/v1/NGDPD/USA) | [NGDPD@WEO/USA](https://www.imf.org/external/datamapper/NGDPD@WEO/USA) |
| ☐ | United States (`US`) | Population, 2026 | **342.838** | Millions of people | `LP` | [www.imf.org…/LP/USA](https://www.imf.org/external/datamapper/api/v1/LP/USA) | [LP@WEO/USA](https://www.imf.org/external/datamapper/LP@WEO/USA) |
| ☐ | United States (`US`) | Unemployment rate, 2026 | **4.2** | Percent | `LUR` | [www.imf.org…/LUR/USA](https://www.imf.org/external/datamapper/api/v1/LUR/USA) | [LUR@WEO/USA](https://www.imf.org/external/datamapper/LUR@WEO/USA) |
| ☐ | China (`CN`) | GDP, 2026 | **21546.403** | Billions of U.S. dollars | `NGDPD` | [www.imf.org…/NGDPD/CHN](https://www.imf.org/external/datamapper/api/v1/NGDPD/CHN) | [NGDPD@WEO/CHN](https://www.imf.org/external/datamapper/NGDPD@WEO/CHN) |
| ☐ | China (`CN`) | Population, 2026 | **1401.733** | Millions of people | `LP` | [www.imf.org…/LP/CHN](https://www.imf.org/external/datamapper/api/v1/LP/CHN) | [LP@WEO/CHN](https://www.imf.org/external/datamapper/LP@WEO/CHN) |
| ☐ | China (`CN`) | Unemployment rate, 2026 | **5.1** | Percent | `LUR` | [www.imf.org…/LUR/CHN](https://www.imf.org/external/datamapper/api/v1/LUR/CHN) | [LUR@WEO/CHN](https://www.imf.org/external/datamapper/LUR@WEO/CHN) |
| ☐ | United Kingdom (`UK`) | GDP, 2026 | **4268.446** | Billions of U.S. dollars | `NGDPD` | [www.imf.org…/NGDPD/GBR](https://www.imf.org/external/datamapper/api/v1/NGDPD/GBR) | [NGDPD@WEO/GBR](https://www.imf.org/external/datamapper/NGDPD@WEO/GBR) |
| ☐ | United Kingdom (`UK`) | Population, 2026 | **69.85** | Millions of people | `LP` | [www.imf.org…/LP/GBR](https://www.imf.org/external/datamapper/api/v1/LP/GBR) | [LP@WEO/GBR](https://www.imf.org/external/datamapper/LP@WEO/GBR) |
| ☐ | United Kingdom (`UK`) | Unemployment rate, 2026 | **5.3** | Percent | `LUR` | [www.imf.org…/LUR/GBR](https://www.imf.org/external/datamapper/api/v1/LUR/GBR) | [LUR@WEO/GBR](https://www.imf.org/external/datamapper/LUR@WEO/GBR) |
| ☐ | India (`IN`) | GDP, 2026 | **4060.207** | Billions of U.S. dollars | `NGDPD` | [www.imf.org…/NGDPD/IND](https://www.imf.org/external/datamapper/api/v1/NGDPD/IND) | [NGDPD@WEO/IND](https://www.imf.org/external/datamapper/NGDPD@WEO/IND) |
| ☐ | India (`IN`) | Population, 2026 | **1476.626** | Millions of people | `LP` | [www.imf.org…/LP/IND](https://www.imf.org/external/datamapper/api/v1/LP/IND) | [LP@WEO/IND](https://www.imf.org/external/datamapper/LP@WEO/IND) |
| ☐ | India (`IN`) | Unemployment rate, 2026 | **5** | Percent | `LUR` | [www.imf.org…/LUR/IND](https://www.imf.org/external/datamapper/api/v1/LUR/IND) | [LUR@WEO/IND](https://www.imf.org/external/datamapper/LUR@WEO/IND) |
| ☐ | Russia (`RU`) | GDP, 2026 | **2861.156** | Billions of U.S. dollars | `NGDPD` | [www.imf.org…/NGDPD/RUS](https://www.imf.org/external/datamapper/api/v1/NGDPD/RUS) | [NGDPD@WEO/RUS](https://www.imf.org/external/datamapper/NGDPD@WEO/RUS) |
| ☐ | Russia (`RU`) | Population, 2026 | **143.394** | Millions of people | `LP` | [www.imf.org…/LP/RUS](https://www.imf.org/external/datamapper/api/v1/LP/RUS) | [LP@WEO/RUS](https://www.imf.org/external/datamapper/LP@WEO/RUS) |
| ☐ | Russia (`RU`) | Unemployment rate, 2026 | **2.2** | Percent | `LUR` | [www.imf.org…/LUR/RUS](https://www.imf.org/external/datamapper/api/v1/LUR/RUS) | [LUR@WEO/RUS](https://www.imf.org/external/datamapper/LUR@WEO/RUS) |

## Part 2 - regions made of many countries (13 figures)

For these the game adds up countries (GDP, population) or takes a population-weighted average (unemployment). Doing the full sum by hand is slow, so check the **three biggest contributors** match the IMF values shown, and glance that the total looks right. The API link lists every country we used; adding the 2026 values gives the game value.

### European Union (27) (`EU`)

| ✓ | Figure | Game value | Unit | Countries used | API link (all countries used) | Three biggest contributors (2026 value) |
|---|---|---|---|---|---|---|
| ☐ | GDP, 2026 | **22806.151** | Billions of U.S. dollars | 27 of 27 | [NGDPD/AUT/BEL/BGR/HRV/CYP/CZE/DNK/EST/FIN/FRA/DEU/GRC/HUN/IRL/ITA/…](https://www.imf.org/external/datamapper/api/v1/NGDPD/AUT/BEL/BGR/HRV/CYP/CZE/DNK/EST/FIN/FRA/DEU/GRC/HUN/IRL/ITA/LVA/LTU/LUX/MLT/NLD/POL/PRT/ROU/SVK/SVN/ESP/SWE) | DEU 5471.299, FRA 3554.155, ITA 2701.737 |
| ☐ | Population, 2026 | **451.424** | Millions of people | 27 of 27 | [LP/AUT/BEL/BGR/HRV/CYP/CZE/DNK/EST/FIN/FRA/DEU/GRC/HUN/IRL/ITA/…](https://www.imf.org/external/datamapper/api/v1/LP/AUT/BEL/BGR/HRV/CYP/CZE/DNK/EST/FIN/FRA/DEU/GRC/HUN/IRL/ITA/LVA/LTU/LUX/MLT/NLD/POL/PRT/ROU/SVK/SVN/ESP/SWE) | DEU 83.278, FRA 69.082, ITA 58.879 |
| ☐ | Unemployment rate, 2026 (population-weighted mean; weights = `LP`) | **6.021** | Percent | 27 of 27 | [LUR/AUT/BEL/BGR/HRV/CYP/CZE/DNK/EST/FIN/FRA/DEU/GRC/HUN/IRL/ITA/…](https://www.imf.org/external/datamapper/api/v1/LUR/AUT/BEL/BGR/HRV/CYP/CZE/DNK/EST/FIN/FRA/DEU/GRC/HUN/IRL/ITA/LVA/LTU/LUX/MLT/NLD/POL/PRT/ROU/SVK/SVN/ESP/SWE) | FIN 10.2, ESP 9.8, SWE 8.5 |

### Gulf states (SAU ARE QAT KWT BHR OMN) (`GULF`)

| ✓ | Figure | Game value | Unit | Countries used | API link (all countries used) | Three biggest contributors (2026 value) |
|---|---|---|---|---|---|---|
| ☐ | GDP, 2026 | **2521.734** | Billions of U.S. dollars | 6 of 6 | [NGDPD/SAU/ARE/QAT/KWT/BHR/OMN…](https://www.imf.org/external/datamapper/api/v1/NGDPD/SAU/ARE/QAT/KWT/BHR/OMN) | SAU 1343.346, ARE 661.018, QAT 203.044 |
| ☐ | Population, 2026 | **63.619** | Millions of people | 6 of 6 | [LP/SAU/ARE/QAT/KWT/BHR/OMN…](https://www.imf.org/external/datamapper/api/v1/LP/SAU/ARE/QAT/KWT/BHR/OMN) | SAU 36.726, ARE 11.575, OMN 5.414 |
| – | Unemployment rate, 2026 | _not in the game_ | Percent | – | – | Only 0 of 6 countries in GULF report a 2026 unemployment rate in the IMF data, too few to represent the region; the sim uses a game-designed starting value. |

### Africa (54 countries) (`AFRICA`)

| ✓ | Figure | Game value | Unit | Countries used | API link (all countries used) | Three biggest contributors (2026 value) |
|---|---|---|---|---|---|---|
| ☐ | GDP, 2026 | **3628.685** | Billions of U.S. dollars | 52 of 54 | [NGDPD/DZA/AGO/BEN/BWA/BFA/BDI/CPV/CMR/CAF/TCD/COM/COD/COG/CIV/DJI/…](https://www.imf.org/external/datamapper/api/v1/NGDPD/DZA/AGO/BEN/BWA/BFA/BDI/CPV/CMR/CAF/TCD/COM/COD/COG/CIV/DJI/EGY/GNQ/SWZ/ETH/GAB/GMB/GHA/GIN/GNB/KEN/LSO/LBR/LBY/MDG/MWI/MLI/MRT/MUS/MAR/MOZ/NAM/NER/NGA/RWA/STP/SYC/SLE/SOM/ZAF/SSD/SDN/TZA/TGO/TUN/UGA/ZMB/ZWE) | ZAF 489.083, EGY 442.886, NGA 386.671 |
| ☐ | Population, 2026 | **1502.443** | Millions of people | 52 of 54 | [LP/DZA/AGO/BEN/BWA/BFA/BDI/CPV/CMR/CAF/TCD/COM/COD/COG/CIV/DJI/…](https://www.imf.org/external/datamapper/api/v1/LP/DZA/AGO/BEN/BWA/BFA/BDI/CPV/CMR/CAF/TCD/COM/COD/COG/CIV/DJI/EGY/GNQ/SWZ/ETH/GAB/GMB/GHA/GIN/GNB/KEN/LSO/LBR/LBY/MDG/MWI/MLI/MRT/MUS/MAR/MOZ/NAM/NER/NGA/RWA/STP/SYC/SLE/SOM/ZAF/SSD/SDN/TZA/TGO/TUN/UGA/ZMB/ZWE) | NGA 242.578, ETH 112.37, EGY 110.058 |
| – | Unemployment rate, 2026 | _not in the game_ | Percent | – | – | Only 6 of 54 countries in AFRICA report a 2026 unemployment rate in the IMF data, too few to represent the region; the sim uses a game-designed starting value. |

### Latin America & Caribbean (`LATAM`)

| ✓ | Figure | Game value | Unit | Countries used | API link (all countries used) | Three biggest contributors (2026 value) |
|---|---|---|---|---|---|---|
| ☐ | GDP, 2026 | **8210.679** | Billions of U.S. dollars | 26 of 27 | [NGDPD/ARG/BOL/BRA/CHL/COL/CRI/DOM/ECU/SLV/GTM/HND/MEX/NIC/PAN/PRY/…](https://www.imf.org/external/datamapper/api/v1/NGDPD/ARG/BOL/BRA/CHL/COL/CRI/DOM/ECU/SLV/GTM/HND/MEX/NIC/PAN/PRY/PER/URY/VEN/HTI/JAM/TTO/GUY/SUR/BLZ/BHS/BRB) | BRA 2654.761, MEX 2176.236, ARG 768.206 |
| ☐ | Population, 2026 | **658.407** | Millions of people | 26 of 27 | [LP/ARG/BOL/BRA/CHL/COL/CRI/DOM/ECU/SLV/GTM/HND/MEX/NIC/PAN/PRY/…](https://www.imf.org/external/datamapper/api/v1/LP/ARG/BOL/BRA/CHL/COL/CRI/DOM/ECU/SLV/GTM/HND/MEX/NIC/PAN/PRY/PER/URY/VEN/HTI/JAM/TTO/GUY/SUR/BLZ/BHS/BRB) | BRA 214.142, MEX 134.407, COL 53.399 |
| ☐ | Unemployment rate, 2026 (population-weighted mean; weights = `LP`) | **5.67** | Percent | 21 of 27 | [LUR/ARG/BOL/BRA/CHL/COL/CRI/DOM/ECU/SLV/HND/MEX/NIC/PAN/PRY/PER/…](https://www.imf.org/external/datamapper/api/v1/LUR/ARG/BOL/BRA/CHL/COL/CRI/DOM/ECU/SLV/HND/MEX/NIC/PAN/PRY/PER/URY/TTO/SUR/BLZ/BHS/BRB) | CHL 9.5, BHS 9.3, PAN 9.1 |

### South-East Asia (11) (`SEA`)

| ✓ | Figure | Game value | Unit | Countries used | API link (all countries used) | Three biggest contributors (2026 value) |
|---|---|---|---|---|---|---|
| ☐ | GDP, 2026 | **4514.663** | Billions of U.S. dollars | 11 of 11 | [NGDPD/IDN/MYS/PHL/SGP/THA/VNM/BRN/KHM/LAO/MMR/TLS…](https://www.imf.org/external/datamapper/api/v1/NGDPD/IDN/MYS/PHL/SGP/THA/VNM/BRN/KHM/LAO/MMR/TLS) | IDN 1479.954, SGP 667.889, THA 599.115 |
| ☐ | Population, 2026 | **700.278** | Millions of people | 11 of 11 | [LP/IDN/MYS/PHL/SGP/THA/VNM/BRN/KHM/LAO/MMR/TLS…](https://www.imf.org/external/datamapper/api/v1/LP/IDN/MYS/PHL/SGP/THA/VNM/BRN/KHM/LAO/MMR/TLS) | IDN 287.198, PHL 115.071, VNM 103.077 |
| ☐ | Unemployment rate, 2026 (population-weighted mean; weights = `LP`) | **3.848** | Percent | 7 of 11 | [LUR/IDN/MYS/PHL/SGP/THA/VNM/BRN…](https://www.imf.org/external/datamapper/api/v1/LUR/IDN/MYS/PHL/SGP/THA/VNM/BRN) | PHL 5.4, IDN 4.7, BRN 4.7 |

Notes: Africa unemployment is not in the game: only 6 of 54 African countries report it, too few to represent the continent, so the game uses a made-up starting value there and does not claim it. The Gulf states have no IMF unemployment figure at all. Both are listed under `gaps` in `data/sources.json`.

## Part 3 - the unemployment split (a game assumption, not a figure)

The IMF gives one total unemployment rate. The game starts both **software-job** and **physical-job** unemployment at that same number. This is a modelling assumption (written into the `note` of every unemployment entry), not a statistic. Nothing to tick, but do not describe those two bars as "IMF software / physical unemployment" on stage.

## Part 4 - links in the report-card debrief (no figures)

These are in `src/ui/ReportCard.tsx` (worker-3). They are context links; check that each page opens in a normal browser. (Checked from a script on 2026-11-08: the UN link answered 200; the IPCC and IEA sites answered 403, which is their bot protection, so someone must open those two by hand.)

| ✓ | Source | Link |
|---|---|---|
| ☐ | IPCC Sixth Assessment Report | https://www.ipcc.ch/report/ar6/syr/ |
| ☐ | IEA, Energy and AI | https://www.iea.org/reports/energy-and-ai |
| ☐ | UN World Population Prospects | https://population.un.org/wpp/ |

## Sign-off

Checked by: ____________  Date: ____________  Anything outside tolerance: ____________
