import { describe, it, expect } from 'vitest';
import { getPrice, canBuy, canSell, executeBuy, executeSell } from '../src/systems/Economy.js';

const mockLocations = {
  station_troy: {
    buys: ['ore'],
    sells: ['medicine'],
    priceModifiers: { medicine: 1.1, ore: 1.2 }
  }
};
const mockItems = {
  medicine: { basePrice: 200, mass: 1 },
  ore: { basePrice: 60, mass: 4 }
};

describe('Economy', () => {
  it('calculates price with location modifier', () => {
    const price = getPrice('medicine', 'station_troy', 1, mockLocations, mockItems);
    const basePrice = 200 * 1.1;
    // Price should be within ±8% due to daily fluctuation
    expect(price).toBeGreaterThanOrEqual(basePrice * 0.92);
    expect(price).toBeLessThanOrEqual(basePrice * 1.08);
  });

  it('price fluctuates slightly with day', () => {
    const p1 = getPrice('medicine', 'station_troy', 1, mockLocations, mockItems);
    const p2 = getPrice('medicine', 'station_troy', 5, mockLocations, mockItems);
    expect(Math.abs(p1 - p2)).toBeLessThan(40);
  });

  it('canBuy returns true when location sells the item and player has credits', () => {
    expect(canBuy('medicine', 'station_troy', mockLocations)).toBe(true);
  });

  it('canBuy returns false when location does not sell the item', () => {
    expect(canBuy('ore', 'station_troy', mockLocations)).toBe(false);
  });

  it('canSell returns true when location buys the item', () => {
    expect(canSell('ore', 'station_troy', mockLocations)).toBe(true);
  });

  it('executeBuy deducts credits and adds cargo', () => {
    const state = { player: { credits: 500, ship: { cargo: [], upgrades: [] }, location: 'station_troy' }, world: { day: 1 } };
    const result = executeBuy('medicine', 1, state, mockLocations, mockItems);
    expect(result.success).toBe(true);
    expect(state.player.credits).toBeLessThan(500);
    expect(state.player.ship.cargo).toHaveLength(1);
  });

  it('executeSell adds credits and removes cargo', () => {
    const state = { player: { credits: 0, ship: { cargo: [{ itemId: 'ore', quantity: 2 }], upgrades: [] }, location: 'station_troy' }, world: { day: 1 } };
    const result = executeSell('ore', 2, state, mockLocations, mockItems);
    expect(result.success).toBe(true);
    expect(state.player.credits).toBeGreaterThan(0);
    expect(state.player.ship.cargo).toHaveLength(0);
  });
});
