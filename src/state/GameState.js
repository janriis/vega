function localStorageAvailable() {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return true;
  } catch (e) {
    return false;
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else if (!(key in target)) {
      result[key] = source[key];
    }
  }
  return result;
}

const DEFAULT_STATE = () => ({
  player: {
    credits: 1000,
    ship: {
      type: 'arrow',
      hullHP: 100,
      maxHullHP: 100,
      shieldHP: 80,
      maxShieldHP: 80,
      cargo: [],
      upgrades: []
    },
    location: 'station_troy',
    reputation: { military: 0, pirates: -20, merchants: 10 }
  },
  world: {
    day: 1,
    prices: {},
    missions: { available: [], active: [], completed: [] }
  },
  story: {
    flags: {},
    chapter: 1
  }
});

const SAVE_KEY = 'vega_save';

const GameState = {
  state: DEFAULT_STATE(),

  save() {
    if (!localStorageAvailable()) {
      console.warn('Save skipped — localStorage unavailable');
      return;
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      // Merge saved data with defaults so new fields are never missing
      this.state = deepMerge(saved, DEFAULT_STATE());
      return true;
    } catch (e) {
      console.warn('Load failed — corrupted save, using defaults:', e);
      this.state = DEFAULT_STATE();
      return false;
    }
  },

  reset() {
    this.state = DEFAULT_STATE();
  },

  checkChapterAdvance() {
    const flags = this.state.story.flags;
    if (this.state.story.chapter === 1 && flags.met_mira && flags.intel_echo_01_done) {
      this.state.story.chapter = 2;
    }
    if (this.state.story.chapter === 2 && flags.conspiracy_revealed) {
      this.state.story.chapter = 3;
    }
  }
};

export default GameState;
