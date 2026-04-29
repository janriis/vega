import { describe, it, expect, beforeEach } from 'vitest';
import GameState from '../src/state/GameState.js';

describe('GameState', () => {
  beforeEach(() => {
    localStorage.clear();
    GameState.reset();
  });

  it('initialises with default values', () => {
    expect(GameState.state.player.credits).toBe(1000);
    expect(GameState.state.player.location).toBe('station_troy');
    expect(GameState.state.story.chapter).toBe(1);
  });

  it('saves and loads state from localStorage', () => {
    GameState.state.player.credits = 5000;
    GameState.save();
    GameState.reset();
    expect(GameState.state.player.credits).toBe(1000);
    GameState.load();
    expect(GameState.state.player.credits).toBe(5000);
  });

  it('load returns false when no save exists', () => {
    const result = GameState.load();
    expect(result).toBe(false);
  });

  it('reset restores default state', () => {
    GameState.state.player.credits = 9999;
    GameState.reset();
    expect(GameState.state.player.credits).toBe(1000);
  });
});
