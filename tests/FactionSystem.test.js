import { describe, it, expect } from 'vitest';
import { applyReputation, shouldAttackOnSight } from '../src/systems/FactionSystem.js';

const factions = {
  pirates: { attackThreshold: 0 },
  military: { attackThreshold: -50 }
};

describe('FactionSystem', () => {
  it('applies reputation delta correctly', () => {
    const state = { player: { reputation: { pirates: -20, military: 0 } } };
    applyReputation(state, 'pirates', 15);
    expect(state.player.reputation.pirates).toBe(-5);
  });

  it('clamps reputation to -100/+100', () => {
    const state = { player: { reputation: { pirates: 90 } } };
    applyReputation(state, 'pirates', 50);
    expect(state.player.reputation.pirates).toBe(100);
  });

  it('pirates attack when rep is below threshold', () => {
    const state = { player: { reputation: { pirates: -20 } } };
    expect(shouldAttackOnSight('pirates', state, factions)).toBe(true);
  });

  it('pirates do not attack when rep is above threshold', () => {
    const state = { player: { reputation: { pirates: 5 } } };
    expect(shouldAttackOnSight('pirates', state, factions)).toBe(false);
  });
});
