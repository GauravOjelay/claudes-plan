import type { CityInfo, Company, Decision, WorldState } from '../contracts';
import { A11yControls } from './a11y';
import { Bar } from './Bar';
import { ARCHETYPE_COLOR, ARCHETYPE_LABEL, CompanyLogo } from './CompanyLogo';
import { DecisionCard, HintLegend } from './DecisionCard';
import { cityName, formatCompact, levelLow, relevantHeadlines, THRESHOLDS } from './format';
import { NewsPopups, NewsTicker } from './News';

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

function Skyline() {
  // Decorative silhouette behind the HQ, tinted with the company colour.
  return (
    <svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M0 100V70h20V50h15v20h10V30h25v40h10V55h20V20h8V10h4v10h8v50h15V45h22v25h12V35h30v35h10V60h18V25h20v45h12V50h25v50Z
           M270 100V40h25v60Z M300 100V58h40v42Z M345 100V30h20v70Z M370 100V62h30v38Z"
      />
    </svg>
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

  return (
    <div className="ui-hq" style={{ ['--hq-color' as string]: ARCHETYPE_COLOR[company.archetype] }}>
      <div className="ui-hq-bg"><Skyline /></div>

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

      <div className="ui-hq-ticker">
        <NewsTicker headlines={news} label={city.toUpperCase()} />
      </div>
    </div>
  );
}
