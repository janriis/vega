import { describe, it, expect } from 'vitest';
import { getAvailableMissions, isMissionComplete, completeMission } from '../src/systems/MissionSystem.js';

const missions = {
  m1: { id: 'm1', giverLocation: 'station_troy', requiresFlag: null, completionFlag: 'm1_done', reward: 500, reputationReward: { merchants: 5 }, type: 'cargo_delivery', cargo: { itemId: 'food', quantity: 2, destination: 'station_kepler' } },
  m2: { id: 'm2', giverLocation: 'station_troy', requiresFlag: 'met_mira', completionFlag: 'm2_done', reward: 800, reputationReward: {}, type: 'intel_courier', destination: 'nav_point_echo' }
};

describe('MissionSystem', () => {
  it('returns missions available at current location', () => {
    const state = { player: { location: 'station_troy' }, world: { missions: { available: [], active: [], completed: [] } }, story: { flags: {} } };
    const available = getAvailableMissions('station_troy', state, missions);
    expect(available.map(m => m.id)).toContain('m1');
  });

  it('gates missions behind required flags', () => {
    const stateNoFlag = { player: { location: 'station_troy' }, world: { missions: { available: [], active: [], completed: [] } }, story: { flags: {} } };
    const stateWithFlag = { ...stateNoFlag, story: { flags: { met_mira: true } } };
    expect(getAvailableMissions('station_troy', stateNoFlag, missions).map(m => m.id)).not.toContain('m2');
    expect(getAvailableMissions('station_troy', stateWithFlag, missions).map(m => m.id)).toContain('m2');
  });

  it('does not show completed missions', () => {
    const state = { player: { location: 'station_troy' }, world: { missions: { available: [], active: [], completed: ['m1'] } }, story: { flags: {} } };
    expect(getAvailableMissions('station_troy', state, missions).map(m => m.id)).not.toContain('m1');
  });

  it('completeMission grants reward and sets flag', () => {
    const state = { player: { credits: 0, reputation: { merchants: 0 } }, world: { missions: { active: ['m1'], completed: [] } }, story: { flags: {} } };
    completeMission('m1', state, missions);
    expect(state.player.credits).toBe(500);
    expect(state.story.flags.m1_done).toBe(true);
    expect(state.world.missions.completed).toContain('m1');
    expect(state.player.reputation.merchants).toBe(5);
  });
});
