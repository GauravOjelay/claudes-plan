/**
 * Average Joe (plan 10.5): one fictional citizen per city whose year is caused by the world state.
 * Pure and deterministic: same state and city always give the same Joe, and no rng is used.
 * Everything here is GAME-DESIGNED (names, occupations, the income scale, mood); none of it is a real-world claim.
 *
 * How the world drives Joe:
 * - job: the city's unemployment in Joe's sector (software or physical) against Joe's own "lay-off point", a stable
 *   number between 4 and 20 (%) taken from a hash of the city. Past it, Joe has lost the job. A lost job becomes
 *   'onUbi' once the 'ubi' pathway is unlocked, else 'retraining' where public trust is high (>= 65), else
 *   'lostSoftwareJob' / 'lostPhysicalJob'.
 * - income: GDP per person x 0.5 x (1.3 - wealth gap/100) while employed; 15% of that when out of work, 35% when
 *   retraining, 45% on UBI. GDP and population are the region's, so the scale follows the real IMF starting data.
 * - mood (0-100): 50 + 0.3 x (trust - 50) - 0.5 x (wealth gap - 50) + job effect + situation effect.
 * - situation: war if tension > 80 or a war build-up is on the skyline; else the strongest city effect that is at least
 *   0.25 strong (blackout, flood, protests, surveillance, outbreak); else prosperous / normal / struggling from mood.
 */
import type { AverageJoe, AverageJoeFn, CityEffect, CityEffectKind, JoeJob, JoeSituation, RegionVars } from '../contracts';
import { CITIES } from '../contracts/cities';
import { SAFETY_NET } from './rules';
import { clamp } from './vars';

const FIRST = ['Sam', 'Maya', 'Leo', 'Ines', 'Noor', 'Tomas', 'Aiko', 'Kofi', 'Elena', 'Ravi', 'Zoe', 'Mateo'];
const LAST = ['Rivera', 'Okafor', 'Lindqvist', 'Tanaka', 'Haddad', 'Moreau', 'Chen', 'Silva', 'Novak', 'Patel', 'Brandt', 'Mensah'];
const SOFTWARE_JOBS = ['customer support agent', 'junior developer', 'data-entry clerk', 'paralegal', 'content moderator', 'bookkeeper'];
const PHYSICAL_JOBS = ['warehouse worker', 'delivery driver', 'factory technician', 'care assistant', 'line cook', 'construction worker'];

/** Strongest first. Kinds not listed here do not change the street scene on their own. */
const SITUATION_OF: Partial<Record<CityEffectKind, JoeSituation>> = {
  warBuildup: 'war',
  blackout: 'blackout',
  flooding: 'flood',
  deepfakeProtests: 'protests',
  unrest: 'protests',
  surveillance: 'surveillance',
  outbreak: 'outbreak',
};
const SITUATION_MOOD: Record<JoeSituation, number> = {
  war: -30, outbreak: -20, flood: -15, blackout: -10, protests: -10, surveillance: -8, struggling: 0, normal: 0, prosperous: 0,
};
const JOB_MOOD: Record<JoeJob, number> = { employed: 10, retraining: 0, onUbi: -2, lostSoftwareJob: -20, lostPhysicalJob: -20 };
const SITUATION_LINE: Record<JoeSituation, string> = {
  war: 'News of the conflict is on every screen and the whole city feels on edge.',
  blackout: 'The power keeps cutting out; the grid cannot keep up with the data centres.',
  flood: 'Water is in the streets again and the sea walls are not keeping up.',
  protests: 'Crowds fill the squares, angry about jobs and who to trust.',
  surveillance: 'Cameras on every corner now; people watch what they say.',
  outbreak: 'Clinics are full and people are staying home.',
  prosperous: 'Cheap energy and steady work; the city feels hopeful.',
  normal: 'An ordinary year, much like the last.',
  struggling: 'Prices are up, wages are flat and nobody trusts the future.',
};

/** FNV-1a: a small stable string hash. Returns an unsigned 32-bit integer. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const unit = (s: string): number => hash(s) / 4294967296; // [0, 1)

function strongestSituation(effects: CityEffect[]): JoeSituation | undefined {
  let best: { s: JoeSituation; i: number } | undefined;
  for (const e of effects) {
    const s = SITUATION_OF[e.kind];
    if (s && e.intensity >= 0.25 && (!best || e.intensity > best.i)) best = { s, i: e.intensity };
  }
  return best?.s;
}

export const averageJoe: AverageJoeFn = (state, cityId): AverageJoe => {
  const city = CITIES.find((c) => c.id === cityId);
  if (!city) throw new Error(`Unknown city: ${cityId}`);
  const r: RegionVars = state.regions[city.region];

  // Who Joe is: stable per city.
  const name = `${FIRST[hash(`${cityId}:first`) % FIRST.length]} ${LAST[hash(`${cityId}:last`) % LAST.length]}`;
  const age = 22 + (hash(`${cityId}:age`) % 37); // 22-58
  const software = unit(`${cityId}:sector`) < 0.5;
  const occupation = software
    ? SOFTWARE_JOBS[hash(`${cityId}:job`) % SOFTWARE_JOBS.length]
    : PHYSICAL_JOBS[hash(`${cityId}:job`) % PHYSICAL_JOBS.length];

  // Job: Joe's sector unemployment against his own lay-off point.
  const sectorUnemployment = software ? r.unemploymentSoftware : r.unemploymentPhysical;
  const layOffPoint = 4 + 16 * unit(`${cityId}:fate`);
  const lost = sectorUnemployment >= layOffPoint;
  const ubi = state.unlockedPathways.includes(SAFETY_NET);
  let job: JoeJob = 'employed';
  if (lost) job = ubi ? 'onUbi' : r.publicTrust >= 65 ? 'retraining' : software ? 'lostSoftwareJob' : 'lostPhysicalJob';

  // Income (USD per year, game scale), rounded to the nearest 100.
  const perPerson = (r.gdp * 1e9) / (r.population * 1e6);
  const working = perPerson * 0.5 * (1.3 - r.wealthGap / 100);
  const share = job === 'employed' ? 1 : job === 'onUbi' ? 0.45 : job === 'retraining' ? 0.35 : 0.15;
  const income = Math.max(0, Math.round((working * share) / 100) * 100);

  // Situation, then mood (which can itself decide prosperous / normal / struggling).
  const calm = (mood: number): JoeSituation => (mood >= 65 ? 'prosperous' : mood >= 40 ? 'normal' : 'struggling');
  const baseMood = 50 + 0.3 * (r.publicTrust - 50) - 0.5 * (r.wealthGap - 50) + JOB_MOOD[job];
  const cityEffects = state.activeCityEffects.filter((e) => e.city === cityId);
  const eventSituation: JoeSituation | undefined =
    state.global.geopoliticalTension > 80 || cityEffects.some((e) => e.kind === 'warBuildup' && e.intensity >= 0.25)
      ? 'war'
      : strongestSituation(cityEffects);
  const situation: JoeSituation = eventSituation ?? calm(baseMood);
  const mood = Math.round(clamp(baseMood + SITUATION_MOOD[situation], 0, 100));

  // Why: 1-3 short sentences, cause then effect, first person, non-graphic.
  const lines: string[] = [];
  const pct = Math.round(sectorUnemployment);
  if (job === 'lostSoftwareJob') lines.push(`I lost my job as a ${occupation} to an AI agent; ${pct}% of people in my line of work are out of a job.`);
  else if (job === 'lostPhysicalJob') lines.push(`Robots took over my shift and I was let go as a ${occupation}; ${pct}% of people in my line of work are out of a job.`);
  else if (job === 'retraining') lines.push(`I am retraining after losing my ${occupation} job; the city pays for the course.`);
  else if (job === 'onUbi') lines.push(`Since I lost my ${occupation} job, the basic income keeps the rent paid.`);
  else if (sectorUnemployment >= 10) lines.push(`I am still working as a ${occupation}, but my team gets smaller every year.`);
  else lines.push(`Work as a ${occupation} is steady.`);
  lines.push(SITUATION_LINE[situation]);
  if (r.publicTrust < 35) lines.push('Nobody here trusts the AI companies any more.');
  else if (r.wealthGap >= 70) lines.push('A few people are getting very rich while the rest of us watch.');

  return { cityId, name, age, occupation, job, income, mood, situation, lines: lines.slice(0, 3) };
};
