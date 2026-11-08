/**
 * PROPOSAL for the lead (owner request, 2026-11-08): "Every city needs companies."
 * North American / European cities: English-pun parodies in the same spirit as the American roster.
 * Everywhere else: puns on real companies from that city/country.
 * Typechecked against the contracts so the lead can paste them into src/contracts/cities.ts:
 *   COMPANY_ROSTER.push(...PROPOSED_COMPANIES)  and  city.companyIds.push(...PROPOSED_CITY_COMPANIES[city.id]).
 * All playable (no rivals). Stats deliberately mix strong/careful and weak/reckless firms.
 * Not imported by the game; the world views pick companies up from the contracts automatically.
 */
import type { Company, CompanyArchetype, RegionId } from '../../contracts';

const v = (money: number, companyValue: number, publicTrust: number, aiCapability: number, safetyLevel: number) => ({
  money, companyValue, publicTrust, aiCapability, safetyLevel,
});

type Row = [id: string, name: string, archetype: CompanyArchetype, vars: Company['vars'], parodyOf: string];

const BY_CITY: Record<string, { region: RegionId; rows: Row[] }> = {
  // ---- North America / Europe (English-pun parodies) ----
  seattle: { region: 'US', rows: [
    ['amazoff', 'Amazoff', 'softwareCompany', v(900, 170, 52, 8, 50), 'Amazon'],
    ['boing', 'Boing', 'chipMaker', v(400, 80, 44, 4, 38), 'Boeing'],
  ] },
  austin: { region: 'US', rows: [
    ['dull', 'Dull', 'chipMaker', v(350, 60, 58, 3, 62), 'Dell'],
    ['miracle', 'Miracle', 'softwareCompany', v(600, 110, 50, 6, 55), 'Oracle'],
  ] },
  mexicocity: { region: 'LATAM', rows: [
    ['bimbot', 'Bimbot', 'researchLab', v(160, 30, 66, 4, 70), 'Grupo Bimbo'],
    ['tellmex', 'TellMex', 'softwareCompany', v(300, 55, 45, 4, 40), 'Telmex'],
    ['banorth', 'Banorth', 'financeFirm', v(250, 45, 55, 2, 60), 'Banorte'],
  ] },
  london: { region: 'UK', rows: [
    ['deepblind', 'DeepBlind', 'frontierLab', v(500, 120, 68, 10, 74), 'DeepMind'],
    ['revolting', 'Revolting', 'financeFirm', v(220, 50, 42, 4, 40), 'Revolut'],
  ] },
  paris: { region: 'EU', rows: [
    ['mistrial', 'Mistrial', 'frontierLab', v(260, 60, 62, 8, 60), 'Mistral AI'],
    ['lvmeh', 'LVMeh', 'softwareCompany', v(700, 120, 58, 3, 64), 'LVMH'],
    ['capgimmick', 'Capgimmick', 'softwareCompany', v(200, 40, 48, 4, 46), 'Capgemini'],
  ] },
  munich: { region: 'EU', rows: [
    ['seamens', 'Seamens', 'chipMaker', v(650, 110, 66, 5, 76), 'Siemens'],
    ['allyanz', 'Allyanz', 'financeFirm', v(700, 100, 60, 3, 70), 'Allianz'],
    ['bmwhy', 'BMWhy', 'researchLab', v(450, 85, 54, 6, 58), 'BMW'],
  ] },
  stockholm: { region: 'EU', rows: [
    ['notify', 'Notify', 'softwareCompany', v(260, 55, 60, 6, 58), 'Spotify'],
    ['klarma', 'Klarma', 'financeFirm', v(180, 38, 46, 4, 44), 'Klarna'],
  ] },
  moscow: { region: 'RU', rows: [
    ['yandoubt', 'Yandoubt', 'frontierLab', v(420, 70, 48, 8, 42), 'Yandex'],
    ['kasperspy', 'Kasperspy', 'softwareCompany', v(200, 40, 40, 5, 50), 'Kaspersky'],
    ['sberbunk', 'Sberbunk', 'stateBackedLab', v(800, 95, 44, 6, 34), 'Sber'],
  ] },
  // ---- Rest of the world (puns on real local companies) ----
  beijing: { region: 'CN', rows: [
    ['baidont', "Baidon't", 'frontierLab', v(550, 90, 50, 9, 44), 'Baidu'],
    ['bitedance', 'BiteDance', 'softwareCompany', v(800, 140, 46, 8, 36), 'ByteDance'],
    ['xiaome', 'Xiao-Me', 'chipMaker', v(450, 80, 56, 5, 58), 'Xiaomi'],
  ] },
  hangzhou: { region: 'CN', rows: [
    ['alibabble', 'Alibabble', 'softwareCompany', v(750, 130, 52, 8, 50), 'Alibaba'],
    ['hikevision', 'HikeVision', 'chipMaker', v(380, 65, 34, 6, 30), 'Hikvision'],
  ] },
  saopaulo: { region: 'LATAM', rows: [
    ['nobank', 'NoBank', 'financeFirm', v(300, 70, 64, 5, 62), 'Nubank'],
    ['itayou', 'ItaYou', 'financeFirm', v(500, 85, 55, 3, 66), 'Itaú'],
    ['ifeed', 'iFeed', 'softwareCompany', v(140, 28, 50, 4, 42), 'iFood'],
  ] },
  dubai: { region: 'GULF', rows: [
    ['g41', 'G41', 'stateBackedLab', v(1000, 120, 48, 9, 46), 'G42'],
    ['careen', 'Careen', 'softwareCompany', v(160, 30, 52, 4, 48), 'Careem'],
    ['emiratesnbdebt', 'Emirates NB-Debt', 'financeFirm', v(600, 85, 50, 2, 60), 'Emirates NBD'],
  ] },
  cairo: { region: 'AFRICA', rows: [
    ['fawrong', 'Fawrong', 'financeFirm', v(120, 22, 56, 3, 60), 'Fawry'],
    ['swerve', 'Swerve', 'softwareCompany', v(80, 16, 44, 3, 40), 'Swvl'],
    ['instabugged', 'Instabugged', 'softwareCompany', v(70, 14, 66, 4, 72), 'Instabug'],
  ] },
  lagos: { region: 'AFRICA', rows: [
    ['paystuck', 'Paystuck', 'financeFirm', v(140, 30, 62, 4, 64), 'Paystack'],
    ['flatterwave', 'Flatterwave', 'financeFirm', v(200, 40, 46, 4, 42), 'Flutterwave'],
    ['andelay', 'Andelay', 'softwareCompany', v(90, 18, 70, 5, 70), 'Andela'],
  ] },
  bangalore: { region: 'IN', rows: [
    ['infomess', 'Infomess', 'softwareCompany', v(500, 80, 58, 5, 62), 'Infosys'],
    ['flopkart', 'Flopkart', 'softwareCompany', v(350, 65, 50, 5, 46), 'Flipkart'],
    ['krutrimmed', 'Krutrimmed', 'frontierLab', v(180, 40, 48, 7, 38), 'Krutrim (Ola)'],
  ] },
  singapore: { region: 'SEA', rows: [
    ['grabby', 'Grabby', 'softwareCompany', v(400, 75, 54, 5, 56), 'Grab'],
    ['seeltd', 'See Ltd', 'softwareCompany', v(450, 80, 50, 6, 50), 'Sea Ltd'],
    ['dbsure', 'DBSure', 'financeFirm', v(650, 95, 70, 3, 78), 'DBS'],
  ] },
  tokyo: { region: 'SEA', rows: [
    ['phony', 'Phony', 'chipMaker', v(700, 125, 66, 6, 72), 'Sony'],
    ['softbunk', 'SoftBunk', 'financeFirm', v(900, 140, 44, 5, 40), 'SoftBank'],
    ['deferrednetworks', 'Deferred Networks', 'frontierLab', v(220, 50, 60, 8, 64), 'Preferred Networks'],
  ] },
};

export const PROPOSED_COMPANIES: Company[] = Object.entries(BY_CITY).flatMap(([city, { region, rows }]) =>
  rows.map(([id, name, archetype, vars]) => ({ id, name, archetype, homeRegion: region, homeCity: city, playable: true, vars })));

/** companyIds to ADD to each city in CITIES. */
export const PROPOSED_CITY_COMPANIES: Record<string, string[]> = Object.fromEntries(
  Object.entries(BY_CITY).map(([city, { rows }]) => [city, rows.map((r) => r[0])]));

/** What each parody is based on (for the lead / debrief). */
export const PARODY_OF: Record<string, string> = Object.fromEntries(
  Object.values(BY_CITY).flatMap(({ rows }) => rows.map((r) => [r[0], r[4]])));
