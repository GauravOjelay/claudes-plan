/** Public API of src/world/ (Claude 2). The lead imports from here in src/app/. */
export { WorldMap, WorldMap2D, type WorldMapProps, type MapMetric, type MapOverlay } from './WorldMap';
export { CityView, CitySkyline, type CityViewProps } from './CityView';
export { CityTimeline, cityTimelineItems, type CityTimelineProps, type TimelineItem } from './CityTimeline';
export { mapPosFromLonLat, REGION_NAMES } from './geo';
export { ALL_EFFECT_KINDS, EFFECT_INFO } from './util';
