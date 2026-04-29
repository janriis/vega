export const ENCOUNTER_TYPES = ['empty', 'pirate_ambush', 'story_event'];

// Encounter rates by destination type
const DEST_RATES = {
  asteroid_field: { pirate_ambush: 0.85, story_event: 0.05, empty: 0.10 },
  nav_point_echo: { pirate_ambush: 0.10, story_event: 0.10, empty: 0.80 },
  station_troy:   { pirate_ambush: 0.20, story_event: 0.05, empty: 0.75 },
  station_blackrock: { pirate_ambush: 0.35, story_event: 0.05, empty: 0.60 },
  station_kepler: { pirate_ambush: 0.15, story_event: 0.05, empty: 0.80 }
};

const DEFAULT_RATES = { pirate_ambush: 0.25, story_event: 0.05, empty: 0.70 };

export function rollEncounter(fromLocation, toLocation, storyFlags) {
  const rates = DEST_RATES[toLocation] || DEFAULT_RATES;
  const roll = Math.random();
  let cumulative = 0;
  for (const [type, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (roll < cumulative) return type;
  }
  return 'empty';
}
