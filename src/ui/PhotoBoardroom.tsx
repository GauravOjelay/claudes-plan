import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CityEffect, Company } from '../contracts';
import { Boardroom, boardroomLook } from './Boardroom';
import { ARCHETYPE_COLOR, CompanyLogo } from './CompanyLogo';

/**
 * Photo-real HQ background (master task #17.1).
 *
 * Five boardroom photos made by the team live in public/hq/. 45 companies share them, so every
 * company gets its own variation of the photo of its home city: mirror flip, zoom and crop,
 * colour grade, sign style. The company logo is a backlit sign on a blank wall/glass area of the
 * photo (`logoArea`, in % of the image) and a small inlay on the table.
 * Motion is slow and uses only transform/opacity (see ui.css); it is off with reduced motion.
 * A city can have its own photo: `public/hq/boardroom-<cityId>.jpg` is tried first (see CITY_PHOTO_LAYOUT for where
 * the sign goes), and the mood photo above is the fallback when that file is missing.
 * If no photo loads, the drawn SVG boardroom is shown instead.
 * Everything is derived from the company id, so it is deterministic (no Math.random).
 */

export type HqPhotoKey = 'dubai' | 'london' | 'tokyo' | 'europe' | 'newyork';

export interface HqPhoto {
  file: string;
  /** Mood of the photo, from public/hq/manifest.json. */
  mood: 'golden' | 'sunset' | 'night' | 'day' | 'dusk';
  /** Blank wall/glass for the sign, in % of the image: x, y = top-left; w, h = size. */
  logoArea: { x: number; y: number; w: number; h: number };
  /** Small logo inlay on the table top: centre x, y and width, in % of the image. */
  tableLogo: { x: number; y: number; w: number };
  /** Perspective of the sign wall in degrees (rotateY). Positive = right edge further away. */
  tilt: number;
  /** Image width / height, so the sign stays on the same spot at any screen shape. */
  aspect: number;
}

/** Mirrors public/hq/manifest.json; logoArea refined by eye against the real images. */
export const HQ_PHOTOS: Record<HqPhotoKey, HqPhoto> = {
  dubai: { file: 'boardroom-dubai.jpg', mood: 'golden', logoArea: { x: 16, y: 14, w: 22, h: 24 }, tableLogo: { x: 46, y: 77, w: 7 }, tilt: -12, aspect: 1.78 },
  london: { file: 'boardroom-london.jpg', mood: 'sunset', logoArea: { x: 56, y: 9, w: 26, h: 17 }, tableLogo: { x: 30, y: 75, w: 8 }, tilt: 0, aspect: 1.81 },
  tokyo: { file: 'boardroom-tokyo.jpg', mood: 'night', logoArea: { x: 70, y: 14, w: 25, h: 30 }, tableLogo: { x: 39, y: 63, w: 7 }, tilt: 8, aspect: 1.8 },
  europe: { file: 'boardroom-europe.jpg', mood: 'day', logoArea: { x: 22, y: 20, w: 26, h: 22 }, tableLogo: { x: 62, y: 76, w: 8 }, tilt: -6, aspect: 1.81 },
  newyork: { file: 'boardroom-newyork.jpg', mood: 'dusk', logoArea: { x: 74, y: 20, w: 22, h: 30 }, tableLogo: { x: 25, y: 71, w: 7 }, tilt: 8, aspect: 1.82 },
};

/** Which photo each city uses (from public/hq/manifest.json). */
export const HQ_CITY_PHOTO: Record<string, HqPhotoKey> = {
  sf: 'newyork', nyc: 'newyork', mexicocity: 'newyork', saopaulo: 'newyork',
  london: 'london', paris: 'europe', munich: 'europe', moscow: 'europe',
  beijing: 'tokyo', tokyo: 'tokyo', singapore: 'tokyo', bangalore: 'tokyo',
  dubai: 'dubai', cairo: 'dubai', lagos: 'dubai',
  seattle: 'newyork', austin: 'newyork', stockholm: 'europe', hangzhou: 'tokyo',
};

/**
 * Layout of a city's OWN photo (`boardroom-<cityId>.jpg`). The image prompts in references/hq-image-prompts.md ask for the
 * blank sign panel in the upper right (60-86% across, 16-40% down), clear of the stats panel on the left, and a clear
 * table top in the lower centre. The photo is never mirrored (that would flip the real skyline).
 * Tune one photo by adding it to CITY_PHOTO_LAYOUT_OVERRIDES.
 */
export const CITY_PHOTO_LAYOUT: Omit<HqPhoto, 'file' | 'mood'> = {
  logoArea: { x: 60, y: 16, w: 26, h: 24 }, tableLogo: { x: 50, y: 80, w: 6 }, tilt: 0, aspect: 1.78,
};
export const CITY_PHOTO_LAYOUT_OVERRIDES: Record<string, Partial<Omit<HqPhoto, 'file' | 'mood'>>> = {};

/** File name of a city's own photo. */
export function cityPhotoFile(cityId: string): string {
  return `boardroom-${cityId}.jpg`;
}

/** Cities whose id is also a mood photo (dubai, london, tokyo) already have their own photo, with its own layout. */
export function hasBuiltInCityPhoto(cityId: string): boolean {
  return Object.prototype.hasOwnProperty.call(HQ_PHOTOS, cityId);
}

/** Files that failed to load this session (404 = the owner has not added that photo yet): not tried again. */
const missingFiles = new Set<string>();

export interface PhotoLook {
  photo: HqPhotoKey;
  /** Mirror the photo left-right. */
  flip: boolean;
  /** Resting zoom (Ken Burns starts here). */
  zoom: number;
  /** Crop offset as a share of the image, so the framing differs. */
  dx: number;
  dy: number;
  /** Colour grade: hue-rotate in degrees, saturation and brightness multipliers. */
  hue: number;
  saturate: number;
  brightness: number;
  signStyle: 'panel' | 'etched' | 'neon';
}

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The stats panel covers the left ~25% of the HQ screen, so a mirrored sign must start right of it. */
export const MIN_FLIPPED_SIGN_X = 28;

const ARCHETYPES: Company['archetype'][] = ['frontierLab', 'chipMaker', 'researchLab', 'stateBackedLab', 'softwareCompany', 'financeFirm'];

/** The photo variation of one company. The three companies of a city always differ in zoom. */
export function photoLook(company: Pick<Company, 'id' | 'archetype' | 'homeCity'>): PhotoLook {
  const h = hashString(`photo|${company.id}|${company.homeCity}`);
  const a = Math.max(0, ARCHETYPES.indexOf(company.archetype));
  const bit = (n: number, mod: number) => ((h >>> n) % mod) / (mod - 1); // 0..1
  const photo = HQ_CITY_PHOTO[company.homeCity] ?? 'newyork';
  const area = HQ_PHOTOS[photo].logoArea;
  // Mirror only when the sign stays clear of the stats panel on the left (x >= MIN_FLIPPED_SIGN_X).
  const canFlip = 100 - area.x - area.w >= MIN_FLIPPED_SIGN_X;
  // A photo whose sign sits under the stats panel (Dubai, Europe) is always mirrored.
  const mustFlip = area.x < MIN_FLIPPED_SIGN_X;
  return {
    photo,
    flip: canFlip && (mustFlip || (((h >>> 3) + a) & 1) === 1),
    // zoom steps by archetype, so same-city companies never share a framing
    zoom: 1.03 + a * 0.02 + bit(5, 5) * 0.012,
    dx: (bit(9, 7) - 0.5) * 0.03,
    dy: (bit(13, 7) - 0.5) * 0.02,
    hue: Math.round((bit(17, 9) - 0.5) * 16),
    saturate: 0.96 + bit(21, 5) * 0.2,
    brightness: 0.96 + bit(25, 5) * 0.1,
    signStyle: boardroomLook(company).signStyle,
  };
}

/** Where the sign goes after the optional mirror flip. */
export function signArea(photo: HqPhoto, flip: boolean) {
  const { x, y, w, h } = photo.logoArea;
  return { x: flip ? 100 - x - w : x, y, w, h, tilt: flip ? -photo.tilt : photo.tilt };
}

function photoUrl(file: string): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base}hq/${file}`;
}

export interface PhotoBoardroomProps {
  company: Company;
  /** Active effects in the company's home city (already filtered). */
  effects?: CityEffect[];
}

/** Decorative background; the HQ screen shows the same facts in text. */
export function PhotoBoardroom({ company, effects = [] }: PhotoBoardroomProps) {
  const [, rerender] = useState(0);
  const [failed, setFailed] = useState(false);
  if (failed) return <Boardroom company={company} effects={effects} />;

  const mood = photoLook(company);
  const moodPhoto = HQ_PHOTOS[mood.photo];
  // Own photo first (unless the city is one of the five that ARE the mood photos), then the mood photo.
  const ownFile = cityPhotoFile(company.homeCity);
  const useOwn = !hasBuiltInCityPhoto(company.homeCity) && !missingFiles.has(ownFile);
  const look: PhotoLook = useOwn ? { ...mood, flip: false } : mood;
  const photo: HqPhoto = useOwn
    ? { file: ownFile, mood: moodPhoto.mood, ...CITY_PHOTO_LAYOUT, ...CITY_PHOTO_LAYOUT_OVERRIDES[company.homeCity] }
    : moodPhoto;
  const onImageError = () => {
    if (useOwn) { missingFiles.add(ownFile); rerender((n) => n + 1); } // fall back to the mood photo
    else setFailed(true);
  };
  const sign = signArea(photo, look.flip);
  const table = { ...photo.tableLogo, x: look.flip ? 100 - photo.tableLogo.x : photo.tableLogo.x };
  const accent = ARCHETYPE_COLOR[company.archetype];
  const level = (k: CityEffect['kind']) => {
    const e = effects.find((x) => x.kind === k);
    const v = Number(e?.intensity);
    return e ? (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5) : 0;
  };
  const blackout = level('blackout');
  const unrest = Math.max(level('unrest'), level('deepfakeProtests'));
  const nameLen = company.name.length;

  const stage: CSSProperties = {
    ['--z' as string]: look.zoom,
    ['--dx' as string]: `${(look.dx * 100).toFixed(2)}%`,
    ['--dy' as string]: `${(look.dy * 100).toFixed(2)}%`,
    ['--aspect' as string]: photo.aspect,
    // On narrow screens the photo is cropped at the sides; keep the sign's side in view.
    ['--focus' as string]: Math.min(0.85, Math.max(0.15, (sign.x + sign.w / 2) / 100)).toFixed(2),
    ['--accent-sign' as string]: accent,
  };

  return (
    <div className="ui-boardroom ui-hqp" data-photo={useOwn ? company.homeCity : look.photo} data-flip={look.flip ? 'yes' : 'no'}
      data-sign={look.signStyle} data-mood={photo.mood} data-city={company.homeCity} aria-hidden="true">
      <div className="ui-hqp-stage" style={stage}>
        <div className="ui-hqp-kb">
          <img key={photo.file} className="ui-hqp-img" src={photoUrl(photo.file)} alt="" draggable={false}
            onError={onImageError}
            style={{
              transform: look.flip ? 'scaleX(-1)' : undefined,
              filter: `hue-rotate(${look.hue}deg) saturate(${look.saturate.toFixed(2)}) brightness(${look.brightness.toFixed(2)})`,
            }} />
          {/* company tint, so the same photo feels different per company */}
          <div className="ui-hqp-tint" style={{ background: accent }} />
          <div className="ui-hqp-haze" />
          <div className="ui-hqp-sweep" />

          <div className={`ui-hqp-sign ui-hqp-sign-${look.signStyle}`}
            style={{
              left: `${sign.x}%`, top: `${sign.y}%`, width: `${sign.w}%`, height: `${sign.h}%`,
              transform: `perspective(900px) rotateY(${sign.tilt}deg)`,
              ['--sw' as string]: sign.w, ['--sh' as string]: sign.h, ['--chars' as string]: Math.max(6, nameLen),
            }}>
            <div className="ui-hqp-sign-inner">
              <CompanyLogo company={company} size={64} />
              <span className="ui-hqp-sign-name" data-long={nameLen > 12 ? 'yes' : 'no'}>{company.name}</span>
            </div>
          </div>

          <div className="ui-hqp-table-logo" style={{ left: `${table.x}%`, top: `${table.y}%`, width: `${table.w}%` }}>
            <CompanyLogo company={company} size={64} />
          </div>

          {blackout > 0 && <div className="ui-hqp-blackout" style={{ opacity: 0.15 + 0.5 * blackout }} />}
          {unrest > 0 && <div className="ui-hqp-unrest" style={{ opacity: 0.25 + 0.5 * unrest }} />}
        </div>
      </div>
      {/* keeps text on top of the picture readable */}
      <div className="ui-hqp-shade" />
    </div>
  );
}
