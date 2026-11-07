import type { Company, CompanyArchetype } from '../contracts';

/** Colour per archetype (Okabe-Ito). Logos are generated, so every company stays fictional. */
export const ARCHETYPE_COLOR: Record<CompanyArchetype, string> = {
  frontierLab: '#0072b2',
  chipMaker: '#e69f00',
  researchLab: '#009e73',
  stateBackedLab: '#d55e00',
};

export const ARCHETYPE_LABEL: Record<CompanyArchetype, string> = {
  frontierLab: 'Frontier lab',
  chipMaker: 'Chip maker',
  researchLab: 'Research lab',
  stateBackedLab: 'State-backed lab',
};

function initials(name: string): string {
  const caps = name.match(/[A-Z]/g) ?? [];
  if (caps.length >= 2) return caps[0] + caps[1];
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Shape per archetype: chip = square die, frontier = hexagon, research = circle, state = shield. */
function Shape({ archetype, color }: { archetype: CompanyArchetype; color: string }) {
  switch (archetype) {
    case 'chipMaker':
      return (
        <g>
          {[14, 26, 38, 50].map((p) => (
            <g key={p} stroke={color} strokeWidth="3">
              <line x1={p} y1="2" x2={p} y2="10" />
              <line x1={p} y1="54" x2={p} y2="62" />
              <line x1="2" y1={p} x2="10" y2={p} />
              <line x1="54" y1={p} x2="62" y2={p} />
            </g>
          ))}
          <rect x="9" y="9" width="46" height="46" rx="6" fill={color} />
        </g>
      );
    case 'frontierLab':
      return <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill={color} />;
    case 'researchLab':
      return <circle cx="32" cy="32" r="29" fill={color} />;
    case 'stateBackedLab':
      return <path d="M32 2 L58 10 V30 C58 46 46 56 32 62 C18 56 6 46 6 30 V10 Z" fill={color} />;
  }
}

export function CompanyLogo({ company, size = 64 }: { company: Company; size?: number }) {
  const color = ARCHETYPE_COLOR[company.archetype];
  return (
    <svg className="ui-logo" viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`${company.name} logo`}>
      <Shape archetype={company.archetype} color={color} />
      <text x="32" y="33" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="800" fill={company.archetype === 'chipMaker' ? '#1d1d1f' : '#fff'}
        fontFamily="system-ui, sans-serif">
        {initials(company.name)}
      </text>
    </svg>
  );
}
