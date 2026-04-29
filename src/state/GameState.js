const DEFAULT_STATE = () => ({
  player: {
    credits: 1000,
    ship: {
      type: 'arrow',
      hullHP: 100,
      shieldHP: 80,
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
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Save failed — localStorage unavailable:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      this.state = JSON.parse(raw);
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
