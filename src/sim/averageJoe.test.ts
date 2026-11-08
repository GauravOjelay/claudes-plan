import { describe, expect, it } from 'vitest';
import type { CityEffect, CityEffectKind, JoeJob, JoeSituation, WorldState } from '../contracts';
import { CITIES } from '../contracts/cities';
import { averageJoe, createInitialState, rngForTurn, step } from './index';

const JOBS: JoeJob[] = ['employed', 'lostSoftwareJob', 'lostPhysicalJob', 'retraining', 'onUbi'];
const SITUATIONS: JoeSituation[] = ['prosperous', 'normal', 'struggling', 'blackout', 'protests', 'flood', 'war', 'surveillance', 'outbreak'];
const fresh = (): WorldState => createInitialState(1, 'closedai');
const fx = (kind: CityEffectKind, intensity: number, city = 'sf'): CityEffect => ({ city, kind, intensity, sinceYear: 2026 });
/** A calm, well-off world where nothing special is happening in San Francisco. */
function calm(): WorldState {
  const s = fresh();
  s.regions.US.unemploymentSoftware = 0;
  s.regions.US.unemploymentPhysical = 0;
  return s;
}
function jobless(s: WorldState, region: keyof WorldState['regions'] = 'US'): WorldState {
  s.regions[region].unemploymentSoftware = 100;
  s.regions[region].unemploymentPhysical = 100;
  return s;
}

describe('who Joe is', () => {
  it('is stable per city: the same name, age and occupation whatever the world does', () => {
    const a = averageJoe(calm(), 'sf');
    const b = averageJoe(jobless(fresh()), 'sf');
    expect([b.name, b.age, b.occupation]).toEqual([a.name, a.age, a.occupation]);
  });
  it('differs between cities, and is fictional-looking and in range', () => {
    const joes = CITIES.map((c) => averageJoe(fresh(), c.id));
    expect(new Set(joes.map((j) => j.name)).size).toBeGreaterThanOrEqual(8);
    for (const j of joes) {
      expect(j.cityId.length).toBeGreaterThan(0);
      expect(j.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
      expect(j.age).toBeGreaterThanOrEqual(22);
      expect(j.age).toBeLessThanOrEqual(58);
      expect(j.occupation.length).toBeGreaterThan(3);
    }
  });
  it('is pure and deterministic: same input same output, and the state is never changed', () => {
    const s = fresh();
    s.activeCityEffects.push(fx('blackout', 0.6));
    const before = JSON.stringify(s);
    expect(averageJoe(s, 'sf')).toEqual(averageJoe(s, 'sf'));
    expect(JSON.stringify(s)).toBe(before);
  });
  it('throws for an unknown city', () => {
    expect(() => averageJoe(fresh(), 'atlantis')).toThrow(/Unknown city/);
  });
});

describe('job: unemployment in his sector, his own lay-off point, UBI, trust', () => {
  it('is employed when nobody in his sector is out of work', () => {
    expect(averageJoe(calm(), 'sf').job).toBe('employed');
  });
  it('loses the job in the sector he works in once unemployment is high enough', () => {
    for (const c of CITIES) {
      const s = jobless(fresh(), c.region);
      s.regions[c.region].publicTrust = 40; // below the retraining bar
      const j = averageJoe(s, c.id);
      expect(['lostSoftwareJob', 'lostPhysicalJob']).toContain(j.job);
      // software jobs vs physical jobs follow his occupation, not chance
      const softwareWords = /agent|developer|clerk|paralegal|moderator|bookkeeper/;
      expect(j.job === 'lostSoftwareJob').toBe(softwareWords.test(j.occupation));
    }
  });
  it('a software Joe is hit by software unemployment, not by physical unemployment (and the reverse)', () => {
    const find = (want: JoeJob): string => CITIES.map((c) => c.id).find((id) => {
      const region = CITIES.find((c) => c.id === id)!.region;
      const s = jobless(fresh(), region);
      s.regions[region].publicTrust = 40;
      return averageJoe(s, id).job === want;
    })!;
    const swCity = find('lostSoftwareJob');
    const phCity = find('lostPhysicalJob');
    expect(swCity && phCity).toBeTruthy();
    const region = (id: string) => CITIES.find((c) => c.id === id)!.region;
    const sw = fresh(); sw.regions[region(swCity)].unemploymentSoftware = 0; sw.regions[region(swCity)].unemploymentPhysical = 100;
    expect(averageJoe(sw, swCity).job).toBe('employed');
    const ph = fresh(); ph.regions[region(phCity)].unemploymentPhysical = 0; ph.regions[region(phCity)].unemploymentSoftware = 100;
    expect(averageJoe(ph, phCity).job).toBe('employed');
  });
  it('lost job + the ubi pathway = onUbi', () => {
    const s = jobless(fresh());
    s.unlockedPathways.push('ubi');
    expect(averageJoe(s, 'sf').job).toBe('onUbi');
  });
  it('lost job + high public trust + no safety net = retraining; UBI wins over retraining', () => {
    const s = jobless(fresh());
    s.regions.US.publicTrust = 80;
    expect(averageJoe(s, 'sf').job).toBe('retraining');
    s.unlockedPathways.push('ubi');
    expect(averageJoe(s, 'sf').job).toBe('onUbi');
  });
  it('an employed Joe stays employed even with UBI', () => {
    const s = calm();
    s.unlockedPathways.push('ubi');
    expect(averageJoe(s, 'sf').job).toBe('employed');
  });
  it('every job outcome can happen', () => {
    const seen = new Set<JoeJob>();
    for (const c of CITIES) {
      const a = jobless(fresh(), c.region); a.regions[c.region].publicTrust = 40;
      const b = jobless(fresh(), c.region); b.regions[c.region].publicTrust = 80;
      const d = jobless(fresh(), c.region); d.unlockedPathways.push('ubi');
      for (const s of [calm(), a, b, d]) seen.add(averageJoe(s, c.id).job);
    }
    expect([...seen].sort()).toEqual([...JOBS].sort());
  });
});

describe('income (game scale) follows GDP per person, the wealth gap and the job', () => {
  it('is positive and plausible for an employed Joe at the start', () => {
    const j = averageJoe(calm(), 'sf');
    expect(j.income).toBeGreaterThan(10000);
    expect(j.income).toBeLessThan(100000);
    expect(j.income % 100).toBe(0);
  });
  it('drops when the job is lost, and UBI and retraining sit in between', () => {
    const work = averageJoe(calm(), 'sf').income;
    const lost = averageJoe(jobless(fresh()), 'sf').income;
    const ubi = (() => { const s = jobless(fresh()); s.unlockedPathways.push('ubi'); return averageJoe(s, 'sf').income; })();
    const retrain = (() => { const s = jobless(fresh()); s.regions.US.publicTrust = 80; return averageJoe(s, 'sf').income; })();
    expect(lost).toBeLessThan(retrain);
    expect(retrain).toBeLessThan(ubi);
    expect(ubi).toBeLessThan(work);
  });
  it('is lower where the wealth gap is wider, and higher where the economy is bigger', () => {
    const a = calm(); a.regions.US.wealthGap = 30;
    const b = calm(); b.regions.US.wealthGap = 80;
    expect(averageJoe(a, 'sf').income).toBeGreaterThan(averageJoe(b, 'sf').income);
    const rich = calm(); rich.regions.US.gdp *= 2;
    expect(averageJoe(rich, 'sf').income).toBeGreaterThan(averageJoe(calm(), 'sf').income);
  });
});

describe('mood', () => {
  const mood = (s: WorldState): number => averageJoe(s, 'sf').mood;
  it('stays within 0-100 even in extreme worlds', () => {
    const worst = jobless(fresh()); worst.regions.US.publicTrust = 0; worst.regions.US.wealthGap = 100; worst.global.geopoliticalTension = 100;
    const best = calm(); best.regions.US.publicTrust = 100; best.regions.US.wealthGap = 0;
    expect(mood(worst)).toBe(0);
    expect(mood(best)).toBeLessThanOrEqual(100);
    expect(mood(best)).toBeGreaterThan(mood(calm()));
  });
  it('rises with trust and falls with a wider wealth gap and with losing the job', () => {
    const t1 = calm(); t1.regions.US.publicTrust = 30;
    const t2 = calm(); t2.regions.US.publicTrust = 90;
    expect(mood(t2)).toBeGreaterThan(mood(t1));
    const g = calm(); g.regions.US.wealthGap = 90;
    expect(mood(g)).toBeLessThan(mood(calm()));
    expect(mood(jobless(fresh()))).toBeLessThan(mood(calm()));
  });
  it('is lower under every kind of trouble', () => {
    for (const kind of ['blackout', 'flooding', 'deepfakeProtests', 'surveillance', 'outbreak', 'warBuildup'] as CityEffectKind[]) {
      const s = calm(); s.activeCityEffects.push(fx(kind, 0.6));
      expect(mood(s), kind).toBeLessThan(mood(calm()));
    }
  });
});

describe('situation: what is happening around him', () => {
  const sit = (s: WorldState): JoeSituation => averageJoe(s, 'sf').situation;
  const withFx = (...e: CityEffect[]): WorldState => { const s = calm(); s.activeCityEffects.push(...e); return s; };
  it('war: tension above 80, or a war build-up on the skyline', () => {
    const t = calm(); t.global.geopoliticalTension = 85;
    expect(sit(t)).toBe('war');
    const t80 = calm(); t80.global.geopoliticalTension = 80;
    expect(sit(t80)).not.toBe('war');
    expect(sit(withFx(fx('warBuildup', 0.5)))).toBe('war');
    expect(sit(withFx(fx('warBuildup', 0.1)))).not.toBe('war'); // a fading tail does not count
  });
  it('blackout, flood, protests, surveillance and outbreak each show up', () => {
    expect(sit(withFx(fx('blackout', 0.6)))).toBe('blackout');
    expect(sit(withFx(fx('flooding', 0.6)))).toBe('flood');
    expect(sit(withFx(fx('deepfakeProtests', 0.6)))).toBe('protests');
    expect(sit(withFx(fx('unrest', 0.6)))).toBe('protests');
    expect(sit(withFx(fx('surveillance', 0.6)))).toBe('surveillance');
    expect(sit(withFx(fx('outbreak', 0.6)))).toBe('outbreak');
  });
  it('the strongest effect wins when several are active, and war beats the rest', () => {
    expect(sit(withFx(fx('blackout', 0.4), fx('deepfakeProtests', 0.8)))).toBe('protests');
    expect(sit(withFx(fx('blackout', 0.9), fx('deepfakeProtests', 0.3)))).toBe('blackout');
    expect(sit(withFx(fx('blackout', 0.9), fx('warBuildup', 0.3)))).toBe('war');
  });
  it('ignores weak effects, effects in other cities, and kinds with no street scene', () => {
    expect(sit(withFx(fx('blackout', 0.2)))).not.toBe('blackout');
    expect(sit(withFx(fx('blackout', 0.9, 'london')))).not.toBe('blackout');
    expect(sit(withFx(fx('solarBoom', 0.9), fx('gridlock', 0.9)))).toBe(sit(calm()));
  });
  it('with nothing happening it follows his mood: prosperous, normal or struggling', () => {
    const good = calm(); good.regions.US.publicTrust = 100; good.regions.US.wealthGap = 20;
    expect(sit(good)).toBe('prosperous');
    expect(sit(calm())).toBe('normal');
    const bad = jobless(fresh()); bad.regions.US.publicTrust = 10; bad.regions.US.wealthGap = 80;
    expect(sit(bad)).toBe('struggling');
  });
  it('every situation can happen', () => {
    const seen = new Set<JoeSituation>();
    const make = (e: CityEffect[], tension = 35): WorldState => { const s = calm(); s.activeCityEffects.push(...e); s.global.geopoliticalTension = tension; return s; };
    for (const s of [make([fx('blackout', 0.6)]), make([fx('flooding', 0.6)]), make([fx('unrest', 0.6)]), make([fx('surveillance', 0.6)]),
      make([fx('outbreak', 0.6)]), make([], 90)]) seen.add(sit(s));
    const good = calm(); good.regions.US.publicTrust = 100; good.regions.US.wealthGap = 20; seen.add(sit(good));
    seen.add(sit(calm()));
    const bad = jobless(fresh()); bad.regions.US.publicTrust = 10; bad.regions.US.wealthGap = 80; seen.add(sit(bad));
    expect([...seen].sort()).toEqual([...SITUATIONS].sort());
  });
});

describe('lines explain why', () => {
  it('are 1-3 short non-empty sentences', () => {
    for (const c of CITIES) {
      for (const s of [calm(), jobless(fresh(), c.region)]) {
        const { lines } = averageJoe(s, c.id);
        expect(lines.length).toBeGreaterThanOrEqual(1);
        expect(lines.length).toBeLessThanOrEqual(3);
        for (const l of lines) { expect(l.length).toBeGreaterThan(10); expect(l.length).toBeLessThan(160); expect(l.endsWith('.')).toBe(true); }
      }
    }
  });
  it('say the cause: the lost job and its occupation, the situation, low trust, a wide gap', () => {
    const s = jobless(fresh());
    s.regions.US.publicTrust = 20;
    s.activeCityEffects.push(fx('blackout', 0.6));
    const j = averageJoe(s, 'sf');
    expect(j.lines[0]).toContain(j.occupation);
    expect(j.lines.join(' ')).toMatch(/power/i);
    expect(j.lines.join(' ')).toMatch(/trust/i);
    const gap = calm(); gap.regions.US.wealthGap = 85;
    expect(averageJoe(gap, 'sf').lines.join(' ')).toMatch(/rich/i);
  });
  it('mention the basic income when Joe is on it', () => {
    const s = jobless(fresh());
    s.unlockedPathways.push('ubi');
    expect(averageJoe(s, 'sf').lines[0]).toMatch(/basic income/i);
  });
  it('contain nothing graphic', () => {
    const s = calm(); s.global.geopoliticalTension = 95; s.activeCityEffects.push(fx('outbreak', 0.9), fx('flooding', 0.9));
    for (const c of CITIES) expect(averageJoe(s, c.id).lines.join(' ')).not.toMatch(/kill|dead|death|blood|corpse|bomb|shot|wound/i);
  });
});

describe('across a whole game', () => {
  it('every city has a valid Joe every year and the story moves with the world', () => {
    let s = fresh();
    const moods: number[] = [];
    while (!s.status.over) {
      for (const c of CITIES) {
        const j = averageJoe(s, c.id);
        expect(JOBS).toContain(j.job);
        expect(SITUATIONS).toContain(j.situation);
        expect(j.mood).toBeGreaterThanOrEqual(0);
        expect(j.mood).toBeLessThanOrEqual(100);
        expect(Number.isFinite(j.income) && j.income >= 0).toBe(true);
      }
      moods.push(averageJoe(s, 'sf').mood);
      s = step(s, [], rngForTurn(s));
    }
    expect(new Set(moods).size).toBeGreaterThan(1); // not frozen
  });
});
