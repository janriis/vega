import { describe, it, expect } from 'vitest';
import { rollEncounter, ENCOUNTER_TYPES } from '../src/systems/EncounterSystem.js';

describe('EncounterSystem', () => {
  it('always returns an encounter type string', () => {
    for (let i = 0; i < 20; i++) {
      const result = rollEncounter('station_troy', 'station_kepler', {});
      expect(ENCOUNTER_TYPES).toContain(result);
    }
  });

  it('asteroid field has high pirate encounter rate', () => {
    const results = Array.from({ length: 100 }, () =>
      rollEncounter('station_troy', 'asteroid_field', {})
    );
    const pirateCount = results.filter(r => r === 'pirate_ambush').length;
    expect(pirateCount).toBeGreaterThan(60);
  });

  it('nav point has low encounter rate', () => {
    const results = Array.from({ length: 100 }, () =>
      rollEncounter('station_troy', 'nav_point_echo', {})
    );
    const emptyCount = results.filter(r => r === 'empty').length;
    expect(emptyCount).toBeGreaterThan(60);
  });
});
