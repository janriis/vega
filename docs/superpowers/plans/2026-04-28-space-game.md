# Space Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable prototype of a cockpit-view space trading/combat game in Phaser.js with dark atmospheric art, branching dialogue, faction reputation, and a 3-chapter story arc.

**Architecture:** Phaser.js handles all rendering and input. A central `GameState` object (plain JS) is the single source of truth — scenes read from and write to it but never communicate with each other directly. All game content (ships, items, missions, dialogue) lives in JSON data files.

**Tech Stack:** Phaser.js 3, Vite (dev server + bundler), Vitest (unit tests), vanilla JavaScript ES modules, Web Audio API (procedural SFX), localStorage (save/load)

---

## File Map

```
/Space-game
  index.html
  package.json
  vite.config.js
  /src
    main.js                    ← Phaser app entry, scene registry
    /scenes
      BootScene.js             ← preload JSON + assets, text crawl on first run
      StarMapScene.js          ← system map, travel, encounter roll
      FlightScene.js           ← cockpit rendering, movement, combat, AI
      StationScene.js          ← docked UI: trade/missions/shipyard/bar tabs
      DialogueScene.js         ← conversation overlay, node traversal
    /state
      GameState.js             ← state shape, save(), load(), reset()
    /systems
      Economy.js               ← price calculation, buy/sell logic
      MissionSystem.js         ← mission availability, completion check
      FactionSystem.js         ← reputation apply, attack-on-sight check
      EncounterSystem.js       ← travel encounter roll
      DialogueSystem.js        ← node traversal, flag setting
      AudioSystem.js           ← Web Audio procedural SFX
    /data
      ships.json
      items.json
      locations.json
      missions.json
      dialogue.json
      factions.json
  /tests
    GameState.test.js
    Economy.test.js
    MissionSystem.test.js
    FactionSystem.test.js
    EncounterSystem.test.js
    DialogueSystem.test.js
```

---

## Phase 1: Foundation

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "space-game",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "phaser": "^3.80.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3000 },
  build: { outDir: 'dist' }
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vega System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create src/main.js**

```js
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import StarMapScene from './scenes/StarMapScene.js';
import FlightScene from './scenes/FlightScene.js';
import StationScene from './scenes/StationScene.js';
import DialogueScene from './scenes/DialogueScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#000005',
  scene: [BootScene, StarMapScene, FlightScene, StationScene, DialogueScene],
  parent: document.body,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  }
};

new Phaser.Game(config);
```

- [ ] **Step 5: Install dependencies and verify dev server starts**

```bash
cd /Users/janriissorensen/Space-game && npm install
npm run dev
```

Expected: Vite starts on http://localhost:3000. Browser shows black screen (no scenes yet). No console errors about missing modules.

- [ ] **Step 6: Commit**

```bash
git init
git add index.html package.json vite.config.js src/main.js
git commit -m "feat: scaffold Phaser + Vite project"
```

---

### Task 2: GameState Module

**Files:**
- Create: `src/state/GameState.js`
- Create: `tests/GameState.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/GameState.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 4 failing tests — `GameState` not found.

- [ ] **Step 3: Implement GameState**

Create `src/state/GameState.js`:

```js
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
  }
};

export default GameState;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/GameState.js tests/GameState.test.js
git commit -m "feat: add GameState with save/load"
```

---

### Task 3: Data Files

**Files:**
- Create: `src/data/ships.json`
- Create: `src/data/items.json`
- Create: `src/data/factions.json`
- Create: `src/data/locations.json`
- Create: `src/data/missions.json`
- Create: `src/data/dialogue.json`

- [ ] **Step 1: Create src/data/ships.json**

```json
{
  "arrow": {
    "name": "Arrow Scout",
    "hullHP": 100,
    "shieldHP": 80,
    "speed": 300,
    "guns": 1,
    "cargoSlots": 20,
    "description": "A nimble scout ship favoured by independent traders."
  },
  "pirate_razor": {
    "name": "Razor",
    "hullHP": 70,
    "shieldHP": 40,
    "speed": 350,
    "guns": 2,
    "cargoSlots": 0,
    "description": "Fast and lightly armoured pirate attack ship."
  },
  "militia_hawk": {
    "name": "Hawk",
    "hullHP": 120,
    "shieldHP": 100,
    "speed": 260,
    "guns": 2,
    "cargoSlots": 0,
    "description": "Standard Militia patrol craft."
  }
}
```

- [ ] **Step 2: Create src/data/items.json**

```json
{
  "food": { "name": "Food Rations", "basePrice": 80, "mass": 1 },
  "fuel": { "name": "Fuel Cells", "basePrice": 120, "mass": 2 },
  "medicine": { "name": "Medicine", "basePrice": 200, "mass": 1 },
  "weapons": { "name": "Weapons", "basePrice": 400, "mass": 3 },
  "ore": { "name": "Ore", "basePrice": 60, "mass": 4 },
  "contraband": { "name": "Contraband", "basePrice": 800, "mass": 2 }
}
```

- [ ] **Step 3: Create src/data/factions.json**

```json
{
  "military": {
    "name": "Vega Militia",
    "color": "#4488ff",
    "attackThreshold": -50,
    "likes": ["bounty_kill", "militia_cargo"],
    "dislikes": ["contraband_trade", "pirate_side"]
  },
  "pirates": {
    "name": "Blackrock Raiders",
    "color": "#ff4444",
    "attackThreshold": 0,
    "likes": ["contraband_trade", "ignore_pirate"],
    "dislikes": ["bounty_kill"]
  },
  "merchants": {
    "name": "Free Traders",
    "color": "#ffaa00",
    "attackThreshold": -80,
    "likes": ["trade_run", "deliver_medicine", "deliver_food"],
    "dislikes": ["combat_near_station"]
  }
}
```

- [ ] **Step 4: Create src/data/locations.json**

```json
{
  "station_troy": {
    "name": "Troy Station",
    "type": "station",
    "faction": "merchants",
    "x": 400, "y": 300,
    "description": "A bustling merchant hub at the system's core.",
    "buys": ["ore", "food", "fuel"],
    "sells": ["medicine", "weapons", "food"],
    "priceModifiers": { "food": 0.9, "medicine": 1.1, "ore": 1.2 },
    "characters": ["mira_chen", "bartender_troy"]
  },
  "station_blackrock": {
    "name": "Blackrock Outpost",
    "type": "station",
    "faction": "pirates",
    "x": 900, "y": 500,
    "description": "A rough outpost on the system's edge. Ask no questions.",
    "buys": ["medicine", "weapons", "contraband"],
    "sells": ["fuel", "contraband", "ore"],
    "priceModifiers": { "contraband": 0.7, "medicine": 1.4, "weapons": 0.85 },
    "characters": ["marcus_vane"]
  },
  "station_kepler": {
    "name": "Fort Kepler",
    "type": "station",
    "faction": "military",
    "x": 200, "y": 550,
    "description": "Militia headquarters in the Vega system. Keep your papers in order.",
    "buys": ["food", "medicine", "fuel"],
    "sells": ["weapons", "fuel", "food"],
    "priceModifiers": { "weapons": 0.8, "contraband": 0 },
    "characters": ["commander_reyes", "militia_clerk"]
  },
  "asteroid_field": {
    "name": "Kepler Belt",
    "type": "asteroid_field",
    "faction": null,
    "x": 650, "y": 180,
    "description": "Dense asteroid field. Rich salvage — high risk.",
    "encounterRate": 0.9,
    "characters": []
  },
  "nav_point_echo": {
    "name": "Nav Point Echo",
    "type": "nav_point",
    "faction": null,
    "x": 750, "y": 450,
    "description": "A derelict navigation beacon. Dead silent.",
    "encounterRate": 0.2,
    "characters": []
  }
}
```

- [ ] **Step 5: Create src/data/missions.json**

```json
{
  "bounty_razor_01": {
    "id": "bounty_razor_01",
    "title": "Pirate Bounty",
    "giverLocation": "station_kepler",
    "type": "combat_bounty",
    "description": "Destroy the Razor-class pirate harassing the Kepler Belt shipping lane.",
    "reward": 800,
    "reputationReward": { "military": 10, "pirates": -5 },
    "requiresFlag": null,
    "completionFlag": "bounty_razor_01_done",
    "target": { "shipType": "pirate_razor", "location": "asteroid_field", "count": 1 }
  },
  "delivery_medicine_01": {
    "id": "delivery_medicine_01",
    "title": "Medical Supplies",
    "giverLocation": "station_troy",
    "type": "cargo_delivery",
    "description": "Deliver 5 units of Medicine to Fort Kepler. They're running low.",
    "reward": 600,
    "reputationReward": { "merchants": 5, "military": 5 },
    "requiresFlag": null,
    "completionFlag": "delivery_medicine_01_done",
    "cargo": { "itemId": "medicine", "quantity": 5, "destination": "station_kepler" }
  },
  "intel_echo_01": {
    "id": "intel_echo_01",
    "title": "Dead Drop",
    "giverLocation": "station_troy",
    "type": "intel_courier",
    "description": "Mira needs you to pick up a data chip at Nav Point Echo. Don't ask what's on it.",
    "reward": 1200,
    "reputationReward": { "merchants": 8 },
    "requiresFlag": "met_mira",
    "completionFlag": "intel_echo_01_done",
    "destination": "nav_point_echo"
  },
  "story_conspiracy_01": {
    "id": "story_conspiracy_01",
    "title": "Follow the Money",
    "giverLocation": "station_troy",
    "type": "story",
    "description": "Mira has a lead. The Militia's books don't add up — someone's skimming pirate loot.",
    "reward": 0,
    "reputationReward": {},
    "requiresFlag": "intel_echo_01_done",
    "completionFlag": "conspiracy_revealed",
    "destination": "station_kepler"
  },
  "story_ending_expose": {
    "id": "story_ending_expose",
    "title": "Burn It Down",
    "giverLocation": "station_troy",
    "type": "story",
    "description": "Expose the Militia's corruption to the Free Traders. This will have consequences.",
    "reward": 2000,
    "reputationReward": { "military": -30, "pirates": 20, "merchants": 30 },
    "requiresFlag": "conspiracy_revealed",
    "completionFlag": "ending_expose"
  },
  "story_ending_coverup": {
    "id": "story_ending_coverup",
    "title": "Bury It",
    "giverLocation": "station_kepler",
    "type": "story",
    "description": "Help Commander Reyes suppress the evidence. The Militia pays well for silence.",
    "reward": 3000,
    "reputationReward": { "military": 30, "pirates": -10, "merchants": -15 },
    "requiresFlag": "conspiracy_revealed",
    "completionFlag": "ending_coverup"
  },
  "story_ending_broker": {
    "id": "story_ending_broker",
    "title": "Everyone Pays",
    "giverLocation": "station_blackrock",
    "type": "story",
    "description": "Broker a deal: Militia pays a tithe to the pirates, everyone stays quiet.",
    "reward": 1500,
    "reputationReward": { "military": 10, "pirates": 10, "merchants": 5 },
    "requiresFlag": "conspiracy_revealed",
    "completionFlag": "ending_broker"
  }
}
```

- [ ] **Step 6: Create src/data/dialogue.json**

```json
{
  "mira_chen_first": {
    "speaker": "mira_chen",
    "text": "New face. You fly that Arrow in the docking bay? Good. I need someone the Militia doesn't know yet.",
    "choices": [
      { "label": "What's the job?", "next": "mira_chen_job" },
      { "label": "Who are you?", "next": "mira_chen_who" },
      { "label": "Not interested.", "next": "mira_chen_dismiss" }
    ],
    "setFlag": "met_mira"
  },
  "mira_chen_job": {
    "speaker": "mira_chen",
    "text": "Nothing dangerous. Yet. I need a data chip picked up from Nav Point Echo. Standard courier run. Pays well.",
    "choices": [
      { "label": "I'll do it.", "next": "mira_chen_accept", "setMission": "intel_echo_01" },
      { "label": "What's on the chip?", "next": "mira_chen_chip" }
    ]
  },
  "mira_chen_chip": {
    "speaker": "mira_chen",
    "text": "Financial records. Boring stuff, unless you're the person whose name is on them. Pick it up and don't read it.",
    "choices": [
      { "label": "Fine. I'll go.", "next": "mira_chen_accept", "setMission": "intel_echo_01" },
      { "label": "No thanks.", "next": "mira_chen_dismiss" }
    ]
  },
  "mira_chen_accept": {
    "speaker": "mira_chen",
    "text": "Smart. Nav Point Echo — you'll see it on your map. And pilot? Watch for Hawks on the way back.",
    "choices": []
  },
  "mira_chen_who": {
    "speaker": "mira_chen",
    "text": "Someone who's been in this system long enough to know where the bodies are buried. Figuratively. Mostly.",
    "choices": [
      { "label": "What's the job?", "next": "mira_chen_job" },
      { "label": "I'll pass.", "next": "mira_chen_dismiss" }
    ]
  },
  "mira_chen_dismiss": {
    "speaker": "mira_chen",
    "text": "Your loss. Come back when you change your mind.",
    "choices": []
  },
  "mira_chen_conspiracy": {
    "speaker": "mira_chen",
    "text": "You read it, didn't you. Those records show Reyes taking a 20% cut of every pirate raid in this system. He's been running both sides.",
    "choices": [
      { "label": "What do we do with this?", "next": "mira_conspiracy_options" }
    ],
    "requiresFlag": "intel_echo_01_done",
    "setFlag": "conspiracy_revealed"
  },
  "mira_conspiracy_options": {
    "speaker": "mira_chen",
    "text": "Three options. Burn him publicly — the traders will love you, the Militia won't. Sell the evidence back to Reyes — he'll pay. Or... broker a deal and make everyone uncomfortable. Your call.",
    "choices": []
  },
  "commander_reyes_first": {
    "speaker": "commander_reyes",
    "text": "Pilot. Fort Kepler has work for reliable contractors. Interested in a bounty contract?",
    "choices": [
      { "label": "Yes, what do you have?", "next": "reyes_bounty" },
      { "label": "Not right now.", "next": "reyes_dismiss" }
    ]
  },
  "reyes_bounty": {
    "speaker": "commander_reyes",
    "text": "Razor-class pirate working the Kepler Belt. Disrupting supply lanes. 800 credits on proof of kill.",
    "choices": [
      { "label": "I'll take it.", "next": "reyes_bounty_accept", "setMission": "bounty_razor_01" },
      { "label": "Maybe later.", "next": "reyes_dismiss" }
    ]
  },
  "reyes_bounty_accept": {
    "speaker": "commander_reyes",
    "text": "Good. Kepler Belt is north of your current position. Don't let it get away.",
    "choices": []
  },
  "reyes_dismiss": {
    "speaker": "commander_reyes",
    "text": "Come back when you're ready to work.",
    "choices": []
  },
  "marcus_vane_first": {
    "speaker": "marcus_vane",
    "text": "You smell like a trader. Blackrock doesn't get many traders. Sit down. What do you need?",
    "choices": [
      { "label": "Just browsing the market.", "next": "marcus_browse" },
      { "label": "I heard you might have work.", "next": "marcus_work" }
    ]
  },
  "marcus_browse": {
    "speaker": "marcus_vane",
    "text": "Market's open. Best prices on fuel in the system. Don't ask where it came from.",
    "choices": []
  },
  "marcus_work": {
    "speaker": "marcus_vane",
    "text": "Depends on what kind of work you mean. Come back with a better reputation and we'll talk.",
    "choices": []
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/data/
git commit -m "feat: add all game data JSON files"
```

---

## Phase 2: Navigation

### Task 4: BootScene

**Files:**
- Create: `src/scenes/BootScene.js`

- [ ] **Step 1: Create src/scenes/BootScene.js**

```js
import Phaser from 'phaser';
import GameState from '../state/GameState.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load all JSON data into Phaser's cache
    this.load.json('ships', '/src/data/ships.json');
    this.load.json('items', '/src/data/items.json');
    this.load.json('factions', '/src/data/factions.json');
    this.load.json('locations', '/src/data/locations.json');
    this.load.json('missions', '/src/data/missions.json');
    this.load.json('dialogue', '/src/data/dialogue.json');

    // Loading bar
    const bar = this.add.rectangle(640, 380, 400, 12, 0x333355);
    const fill = this.add.rectangle(441, 380, 0, 10, 0x4488ff);
    this.add.text(640, 340, 'VEGA SYSTEM', {
      fontFamily: 'monospace', fontSize: '28px', color: '#4488ff'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      fill.width = 398 * value;
      fill.x = 441 + (fill.width / 2);
    });
  }

  create() {
    const isFirstRun = !GameState.load();
    if (isFirstRun) {
      this.showTextCrawl();
    } else {
      this.scene.start('StarMapScene');
    }
  }

  showTextCrawl() {
    const lines = [
      'VEGA SYSTEM — FRONTIER ZONE',
      '',
      'The Vega Militia claims order.',
      'The Blackrock Raiders claim everything else.',
      '',
      'You arrived with 1,000 credits and a beat-up Arrow scout.',
      'You have no idea what you\'re flying into.',
      '',
      'Nobody does.'
    ];

    const container = this.add.container(640, 200);
    lines.forEach((line, i) => {
      const text = this.add.text(0, i * 36, line, {
        fontFamily: 'monospace',
        fontSize: line === '' ? '16px' : '18px',
        color: line.startsWith('VEGA') ? '#4488ff' : '#aabbcc',
        align: 'center'
      }).setOrigin(0.5, 0);
      text.setAlpha(0);
      container.add(text);
      this.tweens.add({ targets: text, alpha: 1, delay: 600 + i * 400, duration: 600 });
    });

    const prompt = this.add.text(640, 620, '[ PRESS SPACE TO BEGIN ]', {
      fontFamily: 'monospace', fontSize: '16px', color: '#4488ff'
    }).setOrigin(0.5).setAlpha(0);

    this.time.delayedCall(600 + lines.length * 400 + 800, () => {
      this.tweens.add({ targets: prompt, alpha: 1, duration: 500 });
      this.input.keyboard.once('keydown-SPACE', () => {
        this.scene.start('StarMapScene');
      });
      this.input.once('pointerdown', () => {
        this.scene.start('StarMapScene');
      });
    });
  }
}
```

- [ ] **Step 2: Verify boot scene runs in browser**

Run `npm run dev` and open http://localhost:3000. Expected: loading bar appears briefly, then text crawl displays line by line. Pressing Space transitions (will error on missing StarMapScene — that's fine for now).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/BootScene.js
git commit -m "feat: add BootScene with loading bar and first-run text crawl"
```

---

### Task 5: EncounterSystem + StarMapScene

**Files:**
- Create: `src/systems/EncounterSystem.js`
- Create: `tests/EncounterSystem.test.js`
- Create: `src/scenes/StarMapScene.js`

- [ ] **Step 1: Write failing tests for EncounterSystem**

Create `tests/EncounterSystem.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 3 failing — `EncounterSystem` not found.

- [ ] **Step 3: Implement EncounterSystem**

Create `src/systems/EncounterSystem.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Create StarMapScene**

Create `src/scenes/StarMapScene.js`:

```js
import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import { rollEncounter } from '../systems/EncounterSystem.js';

export default class StarMapScene extends Phaser.Scene {
  constructor() { super({ key: 'StarMapScene' }); }

  create() {
    this.locations = this.cache.json.get('locations');
    this.drawBackground();
    this.drawConnections();
    this.drawLocations();
    this.drawHUD();
  }

  drawBackground() {
    // Starfield
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, 1280);
      const y = Phaser.Math.Between(0, 720);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      this.add.circle(x, y, size, 0xffffff, alpha);
    }
    // Nebula glow
    const nebula = this.add.graphics();
    nebula.fillStyle(0x220033, 0.15);
    nebula.fillEllipse(900, 200, 500, 300);
    nebula.fillStyle(0x001133, 0.12);
    nebula.fillEllipse(300, 500, 400, 250);

    this.add.text(640, 30, 'VEGA SYSTEM', {
      fontFamily: 'monospace', fontSize: '20px', color: '#4488ff', alpha: 0.7
    }).setOrigin(0.5);
  }

  drawConnections() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x334455, 0.4);
    const locs = Object.values(this.locations);
    for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        g.lineBetween(locs[i].x, locs[i].y, locs[j].x, locs[j].y);
      }
    }
  }

  drawLocations() {
    const factions = this.cache.json.get('factions');
    const currentLoc = GameState.state.player.location;

    Object.entries(this.locations).forEach(([id, loc]) => {
      const isCurrent = id === currentLoc;
      const color = loc.faction ? parseInt(factions[loc.faction]?.color?.replace('#','') || '888888', 16) : 0x888888;
      const radius = loc.type === 'station' ? 14 : 8;

      // Pulse ring for current location
      if (isCurrent) {
        const pulse = this.add.circle(loc.x, loc.y, radius + 8, color, 0.2);
        this.tweens.add({ targets: pulse, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 1500, repeat: -1 });
      }

      const dot = this.add.circle(loc.x, loc.y, radius, color, isCurrent ? 1 : 0.7)
        .setInteractive({ cursor: 'pointer' });

      this.add.text(loc.x, loc.y + radius + 10, loc.name, {
        fontFamily: 'monospace', fontSize: '11px', color: '#aabbcc'
      }).setOrigin(0.5, 0);

      if (!isCurrent) {
        dot.on('pointerover', () => dot.setAlpha(1));
        dot.on('pointerout', () => dot.setAlpha(0.7));
        dot.on('pointerdown', () => this.travelTo(id, loc));
      }
    });
  }

  drawHUD() {
    const s = GameState.state;
    this.hudText = this.add.text(20, 680, this.hudString(), {
      fontFamily: 'monospace', fontSize: '13px', color: '#aabbcc'
    });
  }

  hudString() {
    const s = GameState.state;
    return `CREDITS: ${s.player.credits}  |  DAY: ${s.world.day}  |  LOCATION: ${this.locations[s.player.location]?.name || s.player.location}`;
  }

  travelTo(destId, dest) {
    if (destId === GameState.state.player.location) return;

    GameState.state.world.day += 1;
    const encounter = rollEncounter(GameState.state.player.location, destId, GameState.state.story.flags);
    GameState.state.player.location = destId;
    GameState.save();

    if (dest.type === 'station') {
      if (encounter === 'pirate_ambush') {
        this.scene.start('FlightScene', { encounter: 'pirate_ambush', afterFlight: { scene: 'StationScene', location: destId } });
      } else {
        this.scene.start('StationScene', { location: destId });
      }
    } else {
      this.scene.start('FlightScene', { encounter, location: destId, afterFlight: { scene: 'StarMapScene' } });
    }
  }
}
```

- [ ] **Step 6: Verify in browser**

Open http://localhost:3000. After the text crawl, the star map should appear with 5 locations connected by faint lines. Clicking a location should attempt to start FlightScene or StationScene (errors expected — not built yet).

- [ ] **Step 7: Commit**

```bash
git add src/systems/EncounterSystem.js tests/EncounterSystem.test.js src/scenes/StarMapScene.js
git commit -m "feat: add EncounterSystem and StarMapScene"
```

---

## Phase 3: Combat

### Task 6: FlightScene — Rendering

**Files:**
- Create: `src/scenes/FlightScene.js`

- [ ] **Step 1: Create FlightScene with cockpit rendering**

Create `src/scenes/FlightScene.js`:

```js
import Phaser from 'phaser';
import GameState from '../state/GameState.js';

// Pseudo-3D: enemies have a world position (wx, wy, wz) where wz=distance
// Projected screen position: sx = cx + wx/wz*scale, sy = cy + wy/wz*scale

const SCREEN_CX = 640;
const SCREEN_CY = 320;
const FOV_SCALE = 600;

export default class FlightScene extends Phaser.Scene {
  constructor() { super({ key: 'FlightScene' }); }

  init(data) {
    this.encounterType = data.encounter || 'empty';
    this.afterFlight = data.afterFlight || { scene: 'StarMapScene' };
    this.enemies = [];
    this.bullets = [];
    this.playerVelX = 0;
    this.playerVelY = 0;
    this.flightDone = false;
  }

  create() {
    this.drawStarfield();
    this.createHUD();
    this.setupControls();

    if (this.encounterType === 'pirate_ambush') {
      this.spawnEnemy('pirate_razor');
    } else if (this.encounterType === 'story_event') {
      this.handleStoryEvent();
    } else {
      // Empty space — show briefly then complete
      this.time.delayedCall(2000, () => this.completeFlight());
    }
  }

  drawStarfield() {
    this.starLayers = [];
    const speeds = [0.02, 0.05, 0.12];
    speeds.forEach((speed, layer) => {
      const stars = [];
      for (let i = 0; i < 60 + layer * 40; i++) {
        const x = Phaser.Math.Between(0, 1280);
        const y = Phaser.Math.Between(0, 680);
        const size = 0.5 + layer * 0.7;
        const alpha = 0.3 + layer * 0.3;
        stars.push({ gfx: this.add.circle(x, y, size, 0xffffff, alpha), speed, x, y });
      }
      this.starLayers.push(stars);
    });

    // Nebula background
    const g = this.add.graphics();
    g.fillStyle(0x110022, 0.4);
    g.fillEllipse(800, 150, 600, 350);
    g.fillStyle(0x001122, 0.3);
    g.fillEllipse(200, 500, 450, 300);
  }

  createHUD() {
    const ship = GameState.state.player.ship;
    // HUD panel at bottom
    const hudBg = this.add.rectangle(640, 695, 1280, 50, 0x0a0a18, 0.95);

    this.shieldBar = this.createBar(120, 695, 0x4488ff, ship.shieldHP / 80);
    this.hullBar = this.createBar(340, 695, 0x44bb44, ship.hullHP / 100);
    this.add.text(60, 695, 'SHLD', { fontFamily: 'monospace', fontSize: '10px', color: '#4488ff' }).setOrigin(0.5);
    this.add.text(278, 695, 'HULL', { fontFamily: 'monospace', fontSize: '10px', color: '#44bb44' }).setOrigin(0.5);

    this.radarGraphics = this.add.graphics();
    this.radarCenter = { x: 1160, y: 695 };

    this.targetText = this.add.text(640, 695, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ff4444' }).setOrigin(0.5);

    // Crosshair
    this.crosshair = this.add.graphics();
    this.drawCrosshair(SCREEN_CX, SCREEN_CY);
  }

  createBar(x, y, color, fillRatio) {
    const bg = this.add.rectangle(x, y, 120, 8, 0x222233);
    const fill = this.add.rectangle(x - 60 + (120 * fillRatio / 2), y, 120 * fillRatio, 6, color);
    return { bg, fill, color };
  }

  updateBar(bar, ratio) {
    bar.fill.width = Math.max(0, 120 * ratio);
    bar.fill.x = bar.bg.x - 60 + bar.fill.width / 2;
  }

  drawCrosshair(x, y) {
    this.crosshair.clear();
    this.crosshair.lineStyle(1.5, 0x00ffaa, 0.7);
    this.crosshair.strokeCircle(x, y, 14);
    this.crosshair.lineBetween(x, y - 22, x, y - 16);
    this.crosshair.lineBetween(x, y + 16, x, y + 22);
    this.crosshair.lineBetween(x - 22, y, x - 16, y);
    this.crosshair.lineBetween(x + 16, y, x + 22, y);
    this.crosshair.fillStyle(0x00ffaa, 0.9);
    this.crosshair.fillCircle(x, y, 2);
  }

  setupControls() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      fire: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
    this.fireTimer = 0;
  }

  spawnEnemy(shipType) {
    const ships = this.cache.json.get('ships');
    const data = ships[shipType];
    const enemy = {
      type: shipType,
      data,
      wx: Phaser.Math.FloatBetween(-200, 200),
      wy: Phaser.Math.FloatBetween(-150, 150),
      wz: 800,  // start distance
      hullHP: data.hullHP,
      shieldHP: data.shieldHP,
      state: 'approach',  // patrol | approach | attack | flee
      fireTimer: 0,
      gfx: null,
      bracket: null
    };
    enemy.gfx = this.createEnemyGfx(enemy);
    enemy.bracket = this.add.graphics();
    this.enemies.push(enemy);
  }

  createEnemyGfx(enemy) {
    const g = this.add.graphics();
    this.drawEnemyAt(g, 0, 0, 1);
    return g;
  }

  drawEnemyAt(g, x, y, scale) {
    g.clear();
    const s = scale * 20;
    g.fillStyle(0x660000, 1);
    g.fillTriangle(x, y - s, x + s * 0.7, y + s * 0.6, x - s * 0.7, y + s * 0.6);
    g.lineStyle(1, 0xff5555, 0.9);
    g.strokeTriangle(x, y - s, x + s * 0.7, y + s * 0.6, x - s * 0.7, y + s * 0.6);
    g.fillStyle(0xff3333, 0.6);
    g.fillCircle(x, y - s * 0.1, s * 0.25);
  }

  projectToScreen(wx, wy, wz) {
    if (wz <= 0) return null;
    return {
      x: SCREEN_CX + (wx / wz) * FOV_SCALE,
      y: SCREEN_CY + (wy / wz) * FOV_SCALE,
      scale: FOV_SCALE / wz
    };
  }

  update(time, delta) {
    if (this.flightDone) return;
    const dt = delta / 1000;
    this.handlePlayerInput(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateStars(dt);
    this.updateRadar();
    this.drawCrosshair(SCREEN_CX, SCREEN_CY);

    if (this.enemies.length === 0 && this.encounterType === 'pirate_ambush') {
      this.completeFlight();
    }
  }

  handlePlayerInput(dt) {
    const speed = 180;
    if (this.keys.left.isDown)  this.playerVelX -= speed * dt * 3;
    if (this.keys.right.isDown) this.playerVelX += speed * dt * 3;
    if (this.keys.up.isDown)    this.playerVelY -= speed * dt * 3;
    if (this.keys.down.isDown)  this.playerVelY += speed * dt * 3;

    // Drag
    this.playerVelX *= 0.92;
    this.playerVelY *= 0.92;
    this.playerVelX = Phaser.Math.Clamp(this.playerVelX, -200, 200);
    this.playerVelY = Phaser.Math.Clamp(this.playerVelY, -200, 200);

    // Move all world objects opposite to player velocity
    this.enemies.forEach(e => {
      e.wx -= this.playerVelX * dt;
      e.wy -= this.playerVelY * dt;
    });
    this.bullets.forEach(b => {
      b.wx -= this.playerVelX * dt;
      b.wy -= this.playerVelY * dt;
    });

    // Shooting
    this.fireTimer -= delta;
    if (this.keys.fire.isDown && this.fireTimer <= 0) {
      this.fireBullet();
      this.fireTimer = 300;
    }
  }

  fireBullet() {
    const bullet = {
      wx: 0, wy: 0, wz: 50,
      velZ: -1800,  // moves toward z=0 (away from player)
      gfx: this.add.graphics(),
      age: 0
    };
    this.bullets.push(bullet);
  }

  updateBullets(dt) {
    this.bullets = this.bullets.filter(b => {
      b.wz += b.velZ * dt;
      b.age += dt;

      if (b.wz > 2000 || b.wz < 0 || b.age > 2) {
        b.gfx.destroy();
        return false;
      }

      const proj = this.projectToScreen(b.wx, b.wy, b.wz);
      if (proj) {
        b.gfx.clear();
        b.gfx.fillStyle(0xffaa00, 1);
        b.gfx.fillRect(proj.x - 6, proj.y - 1.5, 12, 3);
        b.gfx.fillStyle(0xffff00, 0.4);
        b.gfx.fillRect(proj.x - 10, proj.y - 1, 18, 2);

        // Check hit on enemies
        this.enemies.forEach(e => {
          const dist = Math.sqrt((b.wx - e.wx) ** 2 + (b.wy - e.wy) ** 2);
          const hitRadius = Math.max(20, (FOV_SCALE / e.wz) * 15);
          if (dist < hitRadius && Math.abs(b.wz - e.wz) < 100) {
            this.hitEnemy(e, 25);
            b.wz = -1;
          }
        });
      }
      return b.wz >= 0;
    });
  }

  hitEnemy(enemy, damage) {
    if (enemy.shieldHP > 0) {
      enemy.shieldHP = Math.max(0, enemy.shieldHP - damage);
    } else {
      enemy.hullHP = Math.max(0, enemy.hullHP - damage);
    }
    if (enemy.hullHP <= 0) this.destroyEnemy(enemy);
    else if (enemy.hullHP / enemy.data.hullHP < 0.2) enemy.state = 'flee';
    else if (enemy.state !== 'flee') enemy.state = 'attack';
  }

  destroyEnemy(enemy) {
    // Explosion flash
    const flash = this.add.circle(SCREEN_CX, SCREEN_CY, 80, 0xff6600, 0.7);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 600, onComplete: () => flash.destroy() });

    const loot = Phaser.Math.Between(100, 400);
    GameState.state.player.credits += loot;
    this.showMessage(`PIRATE DESTROYED  +${loot} credits`);

    enemy.gfx.destroy();
    enemy.bracket.destroy();
    this.enemies = this.enemies.filter(e => e !== enemy);
  }

  updateEnemies(dt) {
    this.enemies.forEach(e => {
      // AI state machine
      const dx = e.wx, dy = e.wy;
      const distScreen = Math.sqrt(dx * dx + dy * dy);

      switch (e.state) {
        case 'approach':
          e.wz -= 150 * dt;
          if (e.wz < 300) e.state = 'attack';
          break;
        case 'attack':
          // Circle strafe
          e.wx += Math.sin(this.time.now * 0.001) * 80 * dt;
          e.wy += Math.cos(this.time.now * 0.0013) * 60 * dt;
          e.wz = Phaser.Math.Clamp(e.wz - 30 * dt, 200, 400);
          // Enemy shoots
          e.fireTimer -= delta || 16;
          if (e.fireTimer <= 0) {
            this.enemyShoot(e);
            e.fireTimer = 1500;
          }
          break;
        case 'flee':
          e.wz += 300 * dt;
          if (e.wz > 3000) {
            e.gfx.destroy();
            e.bracket.destroy();
            this.enemies = this.enemies.filter(en => en !== e);
          }
          break;
      }

      // Render
      const proj = this.projectToScreen(e.wx, e.wy, e.wz);
      if (proj && proj.scale > 0.01) {
        this.drawEnemyAt(e.gfx, proj.x, proj.y, proj.scale);
        this.drawTargetBracket(e.bracket, proj.x, proj.y, proj.scale);
      } else {
        e.gfx.clear();
        e.bracket.clear();
      }
    });
  }

  enemyShoot(enemy) {
    const ship = GameState.state.player.ship;
    ship.shieldHP = Math.max(0, ship.shieldHP - 15);
    if (ship.shieldHP === 0) ship.hullHP = Math.max(0, ship.hullHP - 10);
    this.updateBar(this.shieldBar, ship.shieldHP / 80);
    this.updateBar(this.hullBar, ship.hullHP / 100);

    const flash = this.add.rectangle(640, 360, 1280, 720, 0xff0000, 0.15);
    this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });

    if (ship.hullHP <= 0) this.playerDied();
  }

  playerDied() {
    this.flightDone = true;
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8);
    this.add.text(640, 320, 'SHIP DESTROYED', { fontFamily: 'monospace', fontSize: '36px', color: '#ff4444' }).setOrigin(0.5);
    this.add.text(640, 380, 'Loading last save...', { fontFamily: 'monospace', fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);
    this.time.delayedCall(3000, () => {
      GameState.load();
      this.scene.start('StarMapScene');
    });
  }

  drawTargetBracket(g, x, y, scale) {
    const s = Math.max(16, scale * 30);
    g.clear();
    g.lineStyle(1.5, 0xffff00, 0.8);
    g.lineBetween(x - s, y - s, x - s + 8, y - s);
    g.lineBetween(x - s, y - s, x - s, y - s + 8);
    g.lineBetween(x + s, y - s, x + s - 8, y - s);
    g.lineBetween(x + s, y - s, x + s, y - s + 8);
    g.lineBetween(x - s, y + s, x - s + 8, y + s);
    g.lineBetween(x - s, y + s, x - s, y + s - 8);
    g.lineBetween(x + s, y + s, x + s - 8, y + s);
    g.lineBetween(x + s, y + s, x + s, y + s - 8);
  }

  updateStars(dt) {
    this.starLayers.forEach(layer => {
      layer.forEach(star => {
        star.x -= this.playerVelX * star.speed;
        star.y -= this.playerVelY * star.speed;
        if (star.x < 0) star.x += 1280;
        if (star.x > 1280) star.x -= 1280;
        if (star.y < 0) star.y += 720;
        if (star.y > 720) star.y -= 720;
        star.gfx.setPosition(star.x, star.y);
      });
    });
  }

  updateRadar() {
    this.radarGraphics.clear();
    this.radarGraphics.lineStyle(1, 0x224422, 0.8);
    this.radarGraphics.strokeCircle(this.radarCenter.x, this.radarCenter.y, 30);
    this.radarGraphics.fillStyle(0x001100, 0.7);
    this.radarGraphics.fillCircle(this.radarCenter.x, this.radarCenter.y, 29);
    this.enemies.forEach(e => {
      const angle = Math.atan2(e.wy, e.wx);
      const dist = Math.min(1, Math.sqrt(e.wx ** 2 + e.wy ** 2) / 1000);
      const rx = this.radarCenter.x + Math.cos(angle) * dist * 26;
      const ry = this.radarCenter.y + Math.sin(angle) * dist * 26;
      this.radarGraphics.fillStyle(0xff4444, 1);
      this.radarGraphics.fillCircle(rx, ry, 3);
    });
  }

  handleStoryEvent() {
    this.showMessage('Automated beacon detected at this location.');
    this.time.delayedCall(3000, () => this.completeFlight());
  }

  completeFlight() {
    if (this.flightDone) return;
    this.flightDone = true;
    GameState.save();
    const af = this.afterFlight;
    this.time.delayedCall(500, () => this.scene.start(af.scene, af));
  }

  showMessage(msg) {
    const t = this.add.text(640, 100, msg, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffff88',
      backgroundColor: '#000000aa', padding: { x: 12, y: 6 }
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, delay: 2500, duration: 500, onComplete: () => t.destroy() });
  }
}
```

- [ ] **Step 2: Verify in browser**

Travel from Troy Station to any other location — should now show a cockpit view with star parallax, enemy ship (if pirate encounter), HUD with shield/hull bars, radar, and crosshair. WASD moves the camera, Space fires.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/FlightScene.js
git commit -m "feat: add FlightScene with cockpit rendering and combat"
```

---

## Phase 4: Station

### Task 7: Economy System

**Files:**
- Create: `src/systems/Economy.js`
- Create: `tests/Economy.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/Economy.test.js`:

```js
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
    expect(price).toBeCloseTo(200 * 1.1, 0);
  });

  it('price fluctuates slightly with day', () => {
    const p1 = getPrice('medicine', 'station_troy', 1, mockLocations, mockItems);
    const p2 = getPrice('medicine', 'station_troy', 5, mockLocations, mockItems);
    expect(Math.abs(p1 - p2)).toBeLessThan(40);
  });

  it('canBuy returns true when location sells the item and player has credits', () => {
    expect(canBuy('medicine', 'station_troy', 300, mockLocations)).toBe(true);
  });

  it('canBuy returns false when location does not sell the item', () => {
    expect(canBuy('ore', 'station_troy', 300, mockLocations)).toBe(false);
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 7 failing — `Economy` not found.

- [ ] **Step 3: Implement Economy**

Create `src/systems/Economy.js`:

```js
export function getPrice(itemId, locationId, day, locations, items) {
  const item = items[itemId];
  const loc = locations[locationId];
  if (!item || !loc) return 0;
  const modifier = loc.priceModifiers?.[itemId] ?? 1;
  // Gentle daily fluctuation: ±8% based on a deterministic hash
  const fluctuation = 1 + (Math.sin(day * 7.3 + itemId.charCodeAt(0) * 1.7) * 0.08);
  return Math.round(item.basePrice * modifier * fluctuation);
}

export function canBuy(itemId, locationId, playerCredits, locations) {
  const loc = locations[locationId];
  return loc?.sells?.includes(itemId) ?? false;
}

export function canSell(itemId, locationId, locations) {
  const loc = locations[locationId];
  return loc?.buys?.includes(itemId) ?? false;
}

export function executeBuy(itemId, quantity, state, locations, items) {
  const price = getPrice(itemId, state.player.location, state.world.day, locations, items);
  const total = price * quantity;
  if (state.player.credits < total) return { success: false, reason: 'Insufficient credits' };
  if (!canBuy(itemId, state.player.location, state.player.credits, locations)) return { success: false, reason: 'Not sold here' };

  state.player.credits -= total;
  const existing = state.player.ship.cargo.find(c => c.itemId === itemId);
  if (existing) existing.quantity += quantity;
  else state.player.ship.cargo.push({ itemId, quantity });
  return { success: true };
}

export function executeSell(itemId, quantity, state, locations, items) {
  if (!canSell(itemId, state.player.location, locations)) return { success: false, reason: 'Not bought here' };
  const cargoSlot = state.player.ship.cargo.find(c => c.itemId === itemId);
  if (!cargoSlot || cargoSlot.quantity < quantity) return { success: false, reason: 'Insufficient cargo' };

  const price = getPrice(itemId, state.player.location, state.world.day, locations, items);
  state.player.credits += price * quantity;
  cargoSlot.quantity -= quantity;
  if (cargoSlot.quantity === 0) state.player.ship.cargo = state.player.ship.cargo.filter(c => c.itemId !== itemId);
  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/Economy.js tests/Economy.test.js
git commit -m "feat: add Economy system with buy/sell logic"
```

---

### Task 8: MissionSystem + FactionSystem

**Files:**
- Create: `src/systems/MissionSystem.js`
- Create: `src/systems/FactionSystem.js`
- Create: `tests/MissionSystem.test.js`
- Create: `tests/FactionSystem.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/MissionSystem.test.js`:

```js
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
```

Create `tests/FactionSystem.test.js`:

```js
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

  it('pirates attack when rep is 0 or above threshold', () => {
    const state = { player: { reputation: { pirates: -20 } } };
    expect(shouldAttackOnSight('pirates', state, factions)).toBe(false);
  });

  it('pirates attack when rep meets threshold', () => {
    const state = { player: { reputation: { pirates: 5 } } };
    expect(shouldAttackOnSight('pirates', state, factions)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 7 failing tests.

- [ ] **Step 3: Implement MissionSystem**

Create `src/systems/MissionSystem.js`:

```js
export function getAvailableMissions(locationId, state, allMissions) {
  return Object.values(allMissions).filter(m => {
    if (m.giverLocation !== locationId) return false;
    if (state.world.missions.completed.includes(m.id)) return false;
    if (state.world.missions.active.includes(m.id)) return false;
    if (m.requiresFlag && !state.story.flags[m.requiresFlag]) return false;
    return true;
  });
}

export function isMissionComplete(missionId, state, allMissions) {
  const m = allMissions[missionId];
  if (!m) return false;
  if (m.type === 'cargo_delivery') {
    return state.player.location === m.cargo.destination &&
      state.player.ship.cargo.some(c => c.itemId === m.cargo.itemId && c.quantity >= m.cargo.quantity);
  }
  if (m.type === 'intel_courier' || m.type === 'story') {
    return state.player.location === m.destination;
  }
  if (m.type === 'combat_bounty') {
    return state.story.flags[m.completionFlag + '_kill'] === true;
  }
  return false;
}

export function completeMission(missionId, state, allMissions) {
  const m = allMissions[missionId];
  if (!m) return;
  state.player.credits += m.reward;
  state.story.flags[m.completionFlag] = true;
  state.world.missions.active = state.world.missions.active.filter(id => id !== missionId);
  state.world.missions.completed.push(missionId);
  Object.entries(m.reputationReward || {}).forEach(([faction, amount]) => {
    state.player.reputation[faction] = Phaser.Math.Clamp((state.player.reputation[faction] || 0) + amount, -100, 100);
  });
}
```

- [ ] **Step 4: Implement FactionSystem**

Create `src/systems/FactionSystem.js`:

```js
export function applyReputation(state, factionId, amount) {
  const current = state.player.reputation[factionId] ?? 0;
  state.player.reputation[factionId] = Math.max(-100, Math.min(100, current + amount));
}

export function shouldAttackOnSight(factionId, state, factions) {
  const faction = factions[factionId];
  if (!faction) return false;
  const rep = state.player.reputation[factionId] ?? 0;
  return rep >= faction.attackThreshold;
}
```

Note: MissionSystem uses `Phaser.Math.Clamp` — replace with a plain clamp in tests since Phaser isn't available in the test environment. Update `MissionSystem.js`:

```js
// Replace the Phaser.Math.Clamp line in completeMission with:
state.player.reputation[faction] = Math.max(-100, Math.min(100, (state.player.reputation[faction] || 0) + amount));
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/systems/MissionSystem.js src/systems/FactionSystem.js tests/MissionSystem.test.js tests/FactionSystem.test.js
git commit -m "feat: add MissionSystem and FactionSystem"
```

---

### Task 9: DialogueSystem

**Files:**
- Create: `src/systems/DialogueSystem.js`
- Create: `tests/DialogueSystem.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/DialogueSystem.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getNode, chooseOption, isTerminal } from '../src/systems/DialogueSystem.js';

const dialogue = {
  start: { speaker: 'mira', text: 'Hello.', choices: [{ label: 'Hi', next: 'end' }, { label: 'Bye', next: 'dismiss' }] },
  end: { speaker: 'mira', text: 'Good.', choices: [], setFlag: 'met_mira' },
  dismiss: { speaker: 'mira', text: 'Fine.', choices: [] }
};

describe('DialogueSystem', () => {
  it('getNode returns the node by id', () => {
    expect(getNode('start', dialogue).text).toBe('Hello.');
  });

  it('getNode returns null for missing id', () => {
    expect(getNode('missing', dialogue)).toBeNull();
  });

  it('isTerminal returns true when no choices', () => {
    expect(isTerminal('end', dialogue)).toBe(true);
  });

  it('isTerminal returns false when choices exist', () => {
    expect(isTerminal('start', dialogue)).toBe(false);
  });

  it('chooseOption returns next node id', () => {
    const result = chooseOption('start', 0, dialogue, {});
    expect(result.nextNodeId).toBe('end');
  });

  it('chooseOption sets flags from chosen node', () => {
    const flags = {};
    const result = chooseOption('start', 0, dialogue, flags);
    expect(result.flags.met_mira).toBe(true);
  });

  it('chooseOption returns null for out-of-range choice', () => {
    expect(chooseOption('start', 5, dialogue, {})).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 7 failing.

- [ ] **Step 3: Implement DialogueSystem**

Create `src/systems/DialogueSystem.js`:

```js
export function getNode(nodeId, dialogue) {
  return dialogue[nodeId] ?? null;
}

export function isTerminal(nodeId, dialogue) {
  const node = getNode(nodeId, dialogue);
  return !node || node.choices.length === 0;
}

export function chooseOption(nodeId, choiceIndex, dialogue, flags) {
  const node = getNode(nodeId, dialogue);
  if (!node || choiceIndex >= node.choices.length) return null;
  const choice = node.choices[choiceIndex];
  const nextNode = getNode(choice.next, dialogue);
  const newFlags = { ...flags };
  if (nextNode?.setFlag) newFlags[nextNode.setFlag] = true;
  if (choice.reputationDelta) {
    // Caller applies this — returned for the scene to handle
  }
  return {
    nextNodeId: choice.next,
    flags: newFlags,
    reputationDelta: choice.reputationDelta ?? null,
    setMission: choice.setMission ?? null
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all 7 pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/DialogueSystem.js tests/DialogueSystem.test.js
git commit -m "feat: add DialogueSystem"
```

---

### Task 10: DialogueScene

**Files:**
- Create: `src/scenes/DialogueScene.js`

- [ ] **Step 1: Create DialogueScene**

Create `src/scenes/DialogueScene.js`:

```js
import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import { getNode, isTerminal, chooseOption } from '../systems/DialogueSystem.js';
import { applyReputation } from '../systems/FactionSystem.js';

const CHARACTERS = {
  mira_chen:       { name: 'Mira Chen',        color: '#ffaa44' },
  commander_reyes: { name: 'Cmdr. Reyes',       color: '#4488ff' },
  marcus_vane:     { name: 'Marcus Vane',       color: '#ff5544' },
  bartender_troy:  { name: 'Bartender',         color: '#aaaaaa' },
  militia_clerk:   { name: 'Militia Clerk',     color: '#6699cc' }
};

export default class DialogueScene extends Phaser.Scene {
  constructor() { super({ key: 'DialogueScene' }); }

  init(data) {
    this.characterId = data.characterId;
    this.startNodeId = data.nodeId;
    this.currentNodeId = data.nodeId;
    this.returnScene = data.returnScene || 'StationScene';
  }

  create() {
    this.dialogue = this.cache.json.get('dialogue');
    this.drawPanel();
    this.showNode(this.currentNodeId);
  }

  drawPanel() {
    // Semi-transparent overlay
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6);

    // Panel
    this.panel = this.add.rectangle(640, 490, 1000, 280, 0x080818, 0.97);
    this.add.rectangle(640, 490, 1000, 280).setStrokeStyle(1, 0x334466);

    // Portrait area
    this.portraitGfx = this.add.graphics();
    this.drawPortrait(160, 450, this.characterId);

    // Character name
    const char = CHARACTERS[this.characterId] || { name: this.characterId, color: '#ffffff' };
    this.add.text(280, 365, char.name, {
      fontFamily: 'monospace', fontSize: '16px', color: char.color, fontStyle: 'bold'
    });

    // Dialogue text area
    this.dialogueText = this.add.text(280, 400, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ccddee',
      wordWrap: { width: 650 }, lineSpacing: 6
    });

    this.choiceButtons = [];
  }

  drawPortrait(x, y, characterId) {
    const g = this.portraitGfx;
    g.clear();
    const char = CHARACTERS[characterId] || { color: '#888888' };
    const color = parseInt(char.color.replace('#', ''), 16);
    g.lineStyle(1.5, color, 0.8);
    g.strokeRect(x - 50, y - 60, 100, 120);
    g.fillStyle(color, 0.1);
    g.fillRect(x - 50, y - 60, 100, 120);
    // Simple silhouette
    g.fillStyle(color, 0.5);
    g.fillCircle(x, y - 20, 22);
    g.fillRect(x - 20, y + 4, 40, 50);
  }

  showNode(nodeId) {
    this.clearChoices();
    const node = getNode(nodeId, this.dialogue);
    if (!node) { this.endDialogue(); return; }

    this.currentNodeId = nodeId;
    this.dialogueText.setText(node.text);

    if (isTerminal(nodeId, this.dialogue)) {
      // Apply node-level flag
      if (node.setFlag) GameState.state.story.flags[node.setFlag] = true;
      const closeBtn = this.add.text(840, 590, '[ CLOSE ]', {
        fontFamily: 'monospace', fontSize: '14px', color: '#4488ff',
        backgroundColor: '#111122', padding: { x: 14, y: 8 }
      }).setInteractive({ cursor: 'pointer' });
      closeBtn.on('pointerdown', () => this.endDialogue());
      closeBtn.on('pointerover', () => closeBtn.setColor('#88bbff'));
      closeBtn.on('pointerout', () => closeBtn.setColor('#4488ff'));
      this.choiceButtons.push(closeBtn);
    } else {
      node.choices.forEach((choice, i) => {
        const btn = this.add.text(280, 520 + i * 38, `${i + 1}. ${choice.label}`, {
          fontFamily: 'monospace', fontSize: '14px', color: '#88aacc',
          backgroundColor: '#0d0d20', padding: { x: 12, y: 7 }
        }).setInteractive({ cursor: 'pointer' });
        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout', () => btn.setColor('#88aacc'));
        btn.on('pointerdown', () => this.selectChoice(i));
        this.choiceButtons.push(btn);
      });
    }
  }

  selectChoice(index) {
    const factions = this.cache.json.get('factions');
    const result = chooseOption(this.currentNodeId, index, this.dialogue, GameState.state.story.flags);
    if (!result) return;

    GameState.state.story.flags = result.flags;

    if (result.reputationDelta) {
      applyReputation(GameState.state, result.reputationDelta.factionId, result.reputationDelta.amount);
    }

    if (result.setMission) {
      if (!GameState.state.world.missions.active.includes(result.setMission)) {
        GameState.state.world.missions.active.push(result.setMission);
      }
    }

    this.showNode(result.nextNodeId);
  }

  clearChoices() {
    this.choiceButtons.forEach(b => b.destroy());
    this.choiceButtons = [];
  }

  endDialogue() {
    GameState.save();
    this.scene.stop('DialogueScene');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/DialogueScene.js
git commit -m "feat: add DialogueScene with branching conversation UI"
```

---

### Task 11: StationScene

**Files:**
- Create: `src/scenes/StationScene.js`

- [ ] **Step 1: Create StationScene**

Create `src/scenes/StationScene.js`:

```js
import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import { getPrice, canBuy, canSell, executeBuy, executeSell } from '../systems/Economy.js';
import { getAvailableMissions, completeMission, isMissionComplete } from '../systems/MissionSystem.js';

const TABS = ['TRADE', 'MISSIONS', 'SHIPYARD', 'BAR'];
const UPGRADES = [
  { id: 'shield_booster', name: 'Shield Booster', cost: 1500, description: '+40 max shields', apply: s => { s.ship.shieldHP = Math.min(s.ship.shieldHP + 40, 120); } },
  { id: 'gun_mk2',        name: 'Gun Mk.2',        cost: 2000, description: '+50% weapon damage', apply: () => {} },
  { id: 'cargo_ext',      name: 'Cargo Expansion', cost: 1000, description: '+10 cargo slots', apply: s => { s.ship.cargoSlots = (s.ship.cargoSlots || 20) + 10; } },
  { id: 'afterburner',    name: 'Afterburner',     cost: 2500, description: '+30% top speed', apply: () => {} }
];

export default class StationScene extends Phaser.Scene {
  constructor() { super({ key: 'StationScene' }); }

  init(data) {
    this.locationId = data.location || GameState.state.player.location;
    this.activeTab = 0;
  }

  create() {
    this.locations = this.cache.json.get('locations');
    this.items = this.cache.json.get('items');
    this.allMissions = this.cache.json.get('missions');

    this.locationData = this.locations[this.locationId];
    GameState.state.player.location = this.locationId;

    this.drawBackground();
    this.drawHeader();
    this.drawTabs();
    this.drawTab(this.activeTab);
    this.checkMissionCompletions();
  }

  drawBackground() {
    this.add.rectangle(640, 360, 1280, 720, 0x05050f);
    // Subtle star bg
    for (let i = 0; i < 100; i++) {
      this.add.circle(Phaser.Math.Between(0, 1280), Phaser.Math.Between(0, 720),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.4));
    }
  }

  drawHeader() {
    this.add.rectangle(640, 40, 1280, 80, 0x0a0a20);
    this.add.text(100, 40, this.locationData.name.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '22px', color: '#4488ff', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(500, 40, this.locationData.description, {
      fontFamily: 'monospace', fontSize: '12px', color: '#557799'
    }).setOrigin(0, 0.5);

    this.creditsText = this.add.text(1160, 40, `${GameState.state.player.credits} cr`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffcc44'
    }).setOrigin(1, 0.5);

    const leaveBtn = this.add.text(1240, 40, '[LEAVE]', {
      fontFamily: 'monospace', fontSize: '13px', color: '#4488ff',
      backgroundColor: '#111133', padding: { x: 10, y: 6 }
    }).setOrigin(1, 0.5).setInteractive({ cursor: 'pointer' });
    leaveBtn.on('pointerdown', () => this.scene.start('StarMapScene'));
    leaveBtn.on('pointerover', () => leaveBtn.setColor('#88ccff'));
    leaveBtn.on('pointerout', () => leaveBtn.setColor('#4488ff'));
  }

  drawTabs() {
    this.tabButtons = TABS.map((label, i) => {
      const x = 160 + i * 240;
      const btn = this.add.text(x, 100, label, {
        fontFamily: 'monospace', fontSize: '15px',
        color: i === this.activeTab ? '#ffffff' : '#556688',
        backgroundColor: i === this.activeTab ? '#1a1a3a' : '#0a0a18',
        padding: { x: 24, y: 10 }
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
      btn.on('pointerdown', () => this.switchTab(i));
      return btn;
    });
  }

  switchTab(index) {
    this.activeTab = index;
    this.tabButtons.forEach((btn, i) => {
      btn.setColor(i === index ? '#ffffff' : '#556688');
      btn.setBackgroundColor(i === index ? '#1a1a3a' : '#0a0a18');
    });
    this.contentContainer?.destroy();
    this.drawTab(index);
  }

  drawTab(index) {
    this.contentContainer = this.add.container(0, 0);
    switch (index) {
      case 0: this.drawTradeTab(); break;
      case 1: this.drawMissionsTab(); break;
      case 2: this.drawShipyardTab(); break;
      case 3: this.drawBarTab(); break;
    }
  }

  drawTradeTab() {
    const state = GameState.state;
    const loc = this.locationData;
    const allItemIds = [...new Set([...(loc.sells || []), ...(loc.buys || [])])];

    this.add.text(100, 150, 'COMMODITY', { fontFamily: 'monospace', fontSize: '12px', color: '#557799' });
    this.add.text(500, 150, 'PRICE', { fontFamily: 'monospace', fontSize: '12px', color: '#557799' });
    this.add.text(640, 150, 'IN CARGO', { fontFamily: 'monospace', fontSize: '12px', color: '#557799' });
    this.add.text(800, 150, 'BUY', { fontFamily: 'monospace', fontSize: '12px', color: '#557799' });
    this.add.text(920, 150, 'SELL', { fontFamily: 'monospace', fontSize: '12px', color: '#557799' });

    allItemIds.forEach((itemId, i) => {
      const item = this.items[itemId];
      const price = getPrice(itemId, this.locationId, state.world.day, this.locations, this.items);
      const inCargo = state.player.ship.cargo.find(c => c.itemId === itemId)?.quantity || 0;
      const sells = canBuy(itemId, this.locationId, state.player.credits, this.locations);
      const buys = canSell(itemId, this.locationId, this.locations);
      const y = 185 + i * 44;

      this.add.text(100, y, item.name, { fontFamily: 'monospace', fontSize: '14px', color: '#aabbcc' });
      this.add.text(500, y, `${price} cr`, { fontFamily: 'monospace', fontSize: '14px', color: '#ffcc44' });
      this.add.text(640, y, `${inCargo}`, { fontFamily: 'monospace', fontSize: '14px', color: '#aabbcc' });

      if (sells && state.player.credits >= price) {
        const buyBtn = this.add.text(800, y, '[BUY]', {
          fontFamily: 'monospace', fontSize: '13px', color: '#44cc44',
          backgroundColor: '#0a1a0a', padding: { x: 8, y: 4 }
        }).setInteractive({ cursor: 'pointer' });
        buyBtn.on('pointerdown', () => {
          executeBuy(itemId, 1, state, this.locations, this.items);
          this.creditsText.setText(`${state.player.credits} cr`);
          this.switchTab(0);
        });
      }

      if (buys && inCargo > 0) {
        const sellBtn = this.add.text(920, y, '[SELL]', {
          fontFamily: 'monospace', fontSize: '13px', color: '#cc4444',
          backgroundColor: '#1a0a0a', padding: { x: 8, y: 4 }
        }).setInteractive({ cursor: 'pointer' });
        sellBtn.on('pointerdown', () => {
          executeSell(itemId, 1, state, this.locations, this.items);
          this.creditsText.setText(`${state.player.credits} cr`);
          this.switchTab(0);
        });
      }
    });
  }

  drawMissionsTab() {
    const state = GameState.state;
    const available = getAvailableMissions(this.locationId, state, this.allMissions);
    const active = state.world.missions.active.map(id => this.allMissions[id]).filter(Boolean);

    if (active.length > 0) {
      this.add.text(100, 155, 'ACTIVE MISSIONS', { fontFamily: 'monospace', fontSize: '13px', color: '#ffaa44' });
      active.forEach((m, i) => {
        this.add.text(100, 180 + i * 36, `▸ ${m.title}`, { fontFamily: 'monospace', fontSize: '13px', color: '#ccbbaa' });
      });
    }

    const offsetY = active.length > 0 ? 180 + active.length * 36 + 30 : 155;
    this.add.text(100, offsetY, 'AVAILABLE MISSIONS', { fontFamily: 'monospace', fontSize: '13px', color: '#4488ff' });

    if (available.length === 0) {
      this.add.text(100, offsetY + 30, 'No missions available here.', { fontFamily: 'monospace', fontSize: '13px', color: '#556677' });
      return;
    }

    available.forEach((m, i) => {
      const y = offsetY + 30 + i * 80;
      this.add.text(100, y, m.title, { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' });
      this.add.text(100, y + 20, m.description, { fontFamily: 'monospace', fontSize: '12px', color: '#889aaa', wordWrap: { width: 800 } });
      this.add.text(100, y + 40, `Reward: ${m.reward} credits`, { fontFamily: 'monospace', fontSize: '12px', color: '#ffcc44' });

      const acceptBtn = this.add.text(980, y + 20, '[ACCEPT]', {
        fontFamily: 'monospace', fontSize: '13px', color: '#44bb44',
        backgroundColor: '#0a1a0a', padding: { x: 10, y: 6 }
      }).setInteractive({ cursor: 'pointer' });
      acceptBtn.on('pointerdown', () => {
        if (!state.world.missions.active.includes(m.id)) {
          state.world.missions.active.push(m.id);
        }
        this.switchTab(1);
      });
    });
  }

  drawShipyardTab() {
    const state = GameState.state;
    this.add.text(100, 155, 'SHIP UPGRADES', { fontFamily: 'monospace', fontSize: '13px', color: '#4488ff' });
    this.add.text(100, 178, `Current: ${state.player.ship.type.toUpperCase()}  |  Credits: ${state.player.credits}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#557799'
    });

    UPGRADES.forEach((upgrade, i) => {
      const y = 220 + i * 80;
      const owned = state.player.ship.upgrades.includes(upgrade.id);
      const canAfford = state.player.credits >= upgrade.cost;

      this.add.text(100, y, upgrade.name, { fontFamily: 'monospace', fontSize: '15px', color: owned ? '#448844' : '#aabbcc', fontStyle: 'bold' });
      this.add.text(100, y + 22, upgrade.description, { fontFamily: 'monospace', fontSize: '12px', color: '#668899' });
      this.add.text(100, y + 42, `Cost: ${upgrade.cost} cr`, { fontFamily: 'monospace', fontSize: '12px', color: '#ffcc44' });

      if (owned) {
        this.add.text(980, y + 20, '[INSTALLED]', { fontFamily: 'monospace', fontSize: '13px', color: '#448844' });
      } else {
        const buyBtn = this.add.text(980, y + 20, '[PURCHASE]', {
          fontFamily: 'monospace', fontSize: '13px',
          color: canAfford ? '#44cc44' : '#446644',
          backgroundColor: '#0a1a0a', padding: { x: 10, y: 6 }
        }).setInteractive({ cursor: 'pointer' });
        if (canAfford) {
          buyBtn.on('pointerdown', () => {
            state.player.credits -= upgrade.cost;
            state.player.ship.upgrades.push(upgrade.id);
            upgrade.apply(state.player);
            GameState.save();
            this.creditsText.setText(`${state.player.credits} cr`);
            this.switchTab(2);
          });
        }
      }
    });
  }

  drawBarTab() {
    const characters = this.locationData.characters || [];
    this.add.text(100, 155, 'BAR', { fontFamily: 'monospace', fontSize: '13px', color: '#ffaa44' });

    if (characters.length === 0) {
      this.add.text(100, 185, 'Nobody here worth talking to.', { fontFamily: 'monospace', fontSize: '13px', color: '#556677' });
      return;
    }

    const CHAR_NAMES = {
      mira_chen: 'Mira Chen', commander_reyes: 'Cmdr. Reyes',
      marcus_vane: 'Marcus Vane', bartender_troy: 'Bartender', militia_clerk: 'Militia Clerk'
    };

    characters.forEach((charId, i) => {
      const y = 185 + i * 60;
      const name = CHAR_NAMES[charId] || charId;
      const nodeId = this.getOpeningNode(charId);

      this.add.text(100, y, name, { fontFamily: 'monospace', fontSize: '15px', color: '#ccddee', fontStyle: 'bold' });

      if (nodeId) {
        const talkBtn = this.add.text(980, y, '[TALK]', {
          fontFamily: 'monospace', fontSize: '13px', color: '#4488ff',
          backgroundColor: '#111133', padding: { x: 10, y: 6 }
        }).setInteractive({ cursor: 'pointer' });
        talkBtn.on('pointerdown', () => {
          this.scene.launch('DialogueScene', { characterId: charId, nodeId, returnScene: 'StationScene' });
          this.scene.pause('StationScene');
          this.scene.get('DialogueScene').events.once('shutdown', () => {
            this.scene.resume('StationScene');
            this.switchTab(3);
          });
        });
      }
    });
  }

  getOpeningNode(characterId) {
    const dialogue = this.cache.json.get('dialogue');
    const flags = GameState.state.story.flags;
    // Map characters to their opening node based on story state
    const nodeMap = {
      mira_chen: flags.met_mira
        ? (flags.intel_echo_01_done && !flags.conspiracy_revealed ? 'mira_chen_conspiracy' : null)
        : 'mira_chen_first',
      commander_reyes: 'commander_reyes_first',
      marcus_vane: 'marcus_vane_first',
      bartender_troy: null,
      militia_clerk: null
    };
    const nodeId = nodeMap[characterId];
    return nodeId && dialogue[nodeId] ? nodeId : null;
  }

  checkMissionCompletions() {
    const state = GameState.state;
    state.world.missions.active.forEach(missionId => {
      if (isMissionComplete(missionId, state, this.allMissions)) {
        const m = this.allMissions[missionId];
        completeMission(missionId, state, this.allMissions);
        this.showCompletionNotice(m);
      }
    });
  }

  showCompletionNotice(mission) {
    const panel = this.add.rectangle(640, 360, 500, 120, 0x0a1a0a, 0.95).setStrokeStyle(1, 0x44cc44);
    const title = this.add.text(640, 335, 'MISSION COMPLETE', { fontFamily: 'monospace', fontSize: '18px', color: '#44cc44', fontStyle: 'bold' }).setOrigin(0.5);
    const name = this.add.text(640, 365, mission.title, { fontFamily: 'monospace', fontSize: '14px', color: '#ccddee' }).setOrigin(0.5);
    const reward = this.add.text(640, 390, `+${mission.reward} credits`, { fontFamily: 'monospace', fontSize: '14px', color: '#ffcc44' }).setOrigin(0.5);
    this.time.delayedCall(3000, () => { panel.destroy(); title.destroy(); name.destroy(); reward.destroy(); });
  }
}
```

- [ ] **Step 2: Verify in browser**

Travel to a station — should show a full station UI with 4 tabs. Trade tab shows goods with buy/sell buttons. Bar tab shows characters with Talk buttons.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/StationScene.js
git commit -m "feat: add StationScene with trade, missions, shipyard, bar"
```

---

## Phase 5: Polish

### Task 12: AudioSystem (Procedural SFX)

**Files:**
- Create: `src/systems/AudioSystem.js`

- [ ] **Step 1: Create AudioSystem**

Create `src/systems/AudioSystem.js`:

```js
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function playLaser() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(880, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.15);
}

export function playExplosion() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.6;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);

  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(0.8, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
  source.start(c.currentTime);
}

export function playEngineHum(active) {
  if (!active) {
    if (ctx?._engineOsc) {
      ctx._engineOsc.stop();
      ctx._engineOsc = null;
    }
    return;
  }
  const c = getCtx();
  if (c._engineOsc) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.value = 80;
  gain.gain.value = 0.05;
  osc.start();
  c._engineOsc = osc;
}
```

- [ ] **Step 2: Wire AudioSystem into FlightScene**

In `src/scenes/FlightScene.js`, add the import at the top:

```js
import { playLaser, playExplosion } from '../systems/AudioSystem.js';
```

In `fireBullet()`, add after the bullet push:

```js
playLaser();
```

In `destroyEnemy()`, add at the start:

```js
playExplosion();
```

- [ ] **Step 3: Verify in browser**

Start a flight encounter — laser sound should play on Space, explosion on enemy kill.

- [ ] **Step 4: Commit**

```bash
git add src/systems/AudioSystem.js src/scenes/FlightScene.js
git commit -m "feat: add procedural SFX via Web Audio API"
```

---

### Task 13: Chapter Progression + Story Flags

**Files:**
- Modify: `src/scenes/StationScene.js`
- Modify: `src/state/GameState.js`

- [ ] **Step 1: Add chapter advancement logic to GameState**

In `src/state/GameState.js`, add a `checkChapterAdvance()` method after `reset()`:

```js
checkChapterAdvance() {
  const flags = this.state.story.flags;
  if (this.state.story.chapter === 1 && flags.met_mira && flags.intel_echo_01_done) {
    this.state.story.chapter = 2;
  }
  if (this.state.story.chapter === 2 && flags.conspiracy_revealed) {
    this.state.story.chapter = 3;
  }
}
```

- [ ] **Step 2: Call checkChapterAdvance after dialogue ends**

In `src/scenes/DialogueScene.js`, update `endDialogue()`:

```js
endDialogue() {
  GameState.checkChapterAdvance();
  GameState.save();
  this.scene.stop('DialogueScene');
}
```

- [ ] **Step 3: Add chapter-aware mission filtering**

In `src/systems/MissionSystem.js`, update `getAvailableMissions` to also check `chapter` constraint on story missions:

```js
export function getAvailableMissions(locationId, state, allMissions) {
  return Object.values(allMissions).filter(m => {
    if (m.giverLocation !== locationId) return false;
    if (state.world.missions.completed.includes(m.id)) return false;
    if (state.world.missions.active.includes(m.id)) return false;
    if (m.requiresFlag && !state.story.flags[m.requiresFlag]) return false;
    // Ending missions only available in chapter 3
    if (m.id.startsWith('story_ending') && state.story.chapter < 3) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run tests to verify nothing broke**

```bash
npm test
```

Expected: all tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/GameState.js src/scenes/DialogueScene.js src/systems/MissionSystem.js
git commit -m "feat: add chapter progression and story flag advancement"
```

---

### Task 14: Error Handling + Final Polish

**Files:**
- Modify: `src/scenes/BootScene.js`
- Modify: `src/state/GameState.js`

- [ ] **Step 1: Add localStorage availability check to GameState**

In `src/state/GameState.js`, add a helper at the top after the imports section:

```js
function localStorageAvailable() {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return true;
  } catch (e) {
    return false;
  }
}
```

Update `save()` to use it:

```js
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
}
```

- [ ] **Step 2: Add no-localStorage warning to BootScene**

In `src/scenes/BootScene.js`, at the end of `create()` before checking for first run, add:

```js
// Check localStorage
try {
  localStorage.setItem('__test__', '1');
  localStorage.removeItem('__test__');
} catch (e) {
  this.add.text(640, 680, '⚠ Save/load unavailable in this browser mode', {
    fontFamily: 'monospace', fontSize: '12px', color: '#ff8844'
  }).setOrigin(0.5);
}
```

- [ ] **Step 3: Validate JSON data on boot**

In `src/scenes/BootScene.js`, add at the start of `create()`:

```js
const requiredKeys = { ships: ['arrow'], items: ['food', 'fuel'], factions: ['military', 'pirates', 'merchants'] };
Object.entries(requiredKeys).forEach(([cacheKey, keys]) => {
  const data = this.cache.json.get(cacheKey);
  keys.forEach(k => {
    if (!data[k]) console.warn(`[Boot] Missing expected key "${k}" in ${cacheKey}.json`);
  });
});
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/GameState.js src/scenes/BootScene.js
git commit -m "feat: add error handling for save/load and data validation"
```

---

### Task 15: End-to-End Playtest

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open http://localhost:3000.

- [ ] **Step 2: Verify the full golden path**

Play through this sequence and confirm each step works:

1. First launch → text crawl appears → Space to begin
2. Star map appears with 5 labelled locations
3. Click Troy Station → station UI appears with 4 tabs
4. Trade tab → buy 2 Food Rations → credits decrease
5. Bar tab → talk to Mira Chen → dialogue tree opens → choose "What's the job?" → accept → mission added to active list
6. Leave station → star map
7. Click Kepler Belt (asteroid field) → flight scene → pirate encounter → fight and destroy enemy → hear explosion SFX → flight completes
8. Click Fort Kepler → station → accept Commander Reyes bounty mission → leave
9. Fly to Kepler Belt again → fight another pirate → complete bounty
10. Return to Fort Kepler → mission auto-completes on arrival → credits increase
11. Trade tab → sell Food at Kepler (if they buy it) 
12. Shipyard → buy Shield Booster
13. Fly to Nav Point Echo → flight scene → story event or empty → flight completes
14. Return to Troy Station → Mira's dialogue option has changed (conspiracy node)
15. Talk to Mira → conspiracy revealed → chapter 2
16. Chapter 3 missions appear at appropriate stations → complete one ending
17. Reload browser → save persists, credits/flags/chapter preserved

- [ ] **Step 3: Fix any issues found during playtest**

Document bugs as you find them and fix each one before moving to the next.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete playable prototype — all systems integrated"
```

---

## Summary

| Phase | Tasks | Deliverable |
|---|---|---|
| Foundation | 1–3 | Project runs in browser, GameState saves/loads, all data defined |
| Navigation | 4–5 | Boot screen, star map, travel, encounter roll |
| Combat | 6 | Cockpit view, flight, combat, AI, SFX |
| Station | 7–11 | Trade, missions, shipyard, dialogue, bar |
| Polish | 12–15 | Audio, story progression, error handling, full playtest |

All logic systems are unit-tested. Phaser scenes are integration-tested by playing the game.
