import type { CityInfo, Company, Decision, WorldState } from '../contracts';
import { A11yControls } from './a11y';
import { Bar } from './Bar';
import { ARCHETYPE_COLOR, ARCHETYPE_LABEL, CompanyLogo } from './CompanyLogo';
import { DecisionCard, HintLegend } from './DecisionCard';
import { cityName, formatCompact, levelLow, relevantHeadlines, THRESHOLDS } from './format';
import { NewsPopups, NewsTicker } from './News';
import { CITY_EFFECT_LABEL } from './Skyline';
import { Boardroom } from './Boardroom';

export interface HQScreenProps {
  state: WorldState;
  /** Cards available now. The first one the company hasn't answered yet is shown. */
  decisions: Decision[];
  onChoose: (decisionId: string, optionId: string) => void;
  /** Which HQ to show. Defaults to the player's company. Rivals are view-only (DECISIONS.md #5). */
  companyId?: string;
  /** Used to show the city name; falls back to the city id. */
  cities?: CityInfo[];
  /** Optional "back to city" link. */
  onBack?: () => void;
}

function CompanyStats({ company }: { company: Company }) {
  const v = company.vars;
  return (
    <section className="ui-panel" aria-label="Company stats">
      <h2>Company</h2>
      <div className="ui-stat-row"><span>Money</span><strong>{formatCompact(v.money)}</strong></div>
      <div className="ui-stat-row"><span>Company value</span><strong>{formatCompact(v.companyValue)}</strong></div>
      <div className="ui-stat-row"><span>AI capability</span><strong>{formatCompact(v.aiCapability)}</strong></div>
      <div style={{ marginTop: '0.8rem' }}>
        <Bar label="Safety level" value={v.safetyLevel} level={levelLow(v.safetyLevel, { warn: 40, danger: 20 })} />
        <Bar label="Public trust" value={v.publicTrust} level={levelLow(v.publicTrust, THRESHOLDS.trust)} />
      </div>
    </section>
  );
}

/** Screen 3: company HQ (docs/plan.md 10.4). Decision cards are only available here. */
export function HQScreen({ state, decisions, onChoose, companyId, cities, onBack }: HQScreenProps) {
  const id = companyId ?? state.playerCompanyId;
  const company = state.companies.find((c) => c.id === id);
  if (!company) {
    return <div className="ui-panel" role="alert">Unknown company: {id}</div>;
  }
  const isPlayer = company.id === state.playerCompanyId && company.playable;
  const answered = new Set(state.choiceLog.filter((c) => c.companyId === company.id).map((c) => c.decisionId));
  const next = decisions.find((d) => !answered.has(d.id));
  const news = relevantHeadlines(state.headlines, company.id, company.homeCity);
  const city = cityName(cities, company.homeCity);
  const gameOver = state.status.over;
  const effects = state.activeCityEffects.filter((e) => e.city === company.homeCity);

  return (
    <div className="ui-hq" style={{ ['--hq-color' as string]: ARCHETYPE_COLOR[company.archetype] }}>
      <div className="ui-hq-bg"><Boardroom company={company} effects={effects} /></div>

      <header className="ui-hq-header">
        {onBack && <button className="ui-btn" onClick={onBack}>← {city}</button>}
        <CompanyLogo company={company} />
        <div>
          <h1>{company.name} HQ</h1>
          <div className="ui-muted">
            {ARCHETYPE_LABEL[company.archetype]} · {city}
            {!isPlayer && ' · Rival (view only)'}
          </div>
        </div>
        <div className="ui-year" aria-label={`Year ${state.year}`}>{state.year}</div>
        <A11yControls />
      </header>

      <CompanyStats company={company} />

      <section className="ui-hq-center" aria-label="Decision">
        {gameOver ? (
          <div className="ui-viewonly"><strong>The game is over.</strong></div>
        ) : !isPlayer ? (
          <div className="ui-viewonly">
            <strong>{company.name} is a rival.</strong>
            <p className="ui-muted">You can watch its numbers, but only your own company takes decisions.</p>
          </div>
        ) : next ? (
          <>
            <DecisionCard key={next.id} decision={next} onChoose={onChoose} />
            <HintLegend />
          </>
        ) : (
          <div className="ui-viewonly">
            <strong>No decisions waiting.</strong>
            <p className="ui-muted">Advance to the next year to see what your choices changed.</p>
          </div>
        )}
      </section>

      <aside>
        <NewsPopups key={company.id} headlines={news} />
      </aside>

      {effects.length > 0 && (
        <p className="ui-hq-effects" aria-label={`Happening in ${city}`}>
          <span className="ui-muted">Now in {city}:</span>
          {effects.map((e) => <span key={e.kind} className="ui-chip">{CITY_EFFECT_LABEL[e.kind] ?? e.kind}</span>)}
        </p>
      )}

      <div className="ui-hq-ticker">
        <NewsTicker headlines={news} label={city.toUpperCase()} />
      </div>
    </div>
  );
}
