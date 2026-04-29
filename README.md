# Vega System

A cockpit-view space trading and combat game built in Phaser.js. Fly between stations in a frontier star system, trade goods, take missions, fight pirates, and uncover a faction conspiracy.

**Inspired by:** Wing Commander: Privateer, Freelancer

![Phaser 3](https://img.shields.io/badge/Phaser-3.80-blue) ![Vite](https://img.shields.io/badge/Vite-5.0-646CFF) ![Vitest](https://img.shields.io/badge/Vitest-1.0-6E9F3E) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Gameplay

You arrive in the Vega system with 1,000 credits and a beat-up Arrow scout. Three factions control the frontier — the Vega Militia, the Blackrock Raiders, and the Free Traders. Your choices shape the story.

### Features

- **Pseudo-3D cockpit combat** — enemies scale with distance, mouse-aim with crosshair, parallax starfield
- **Trading economy** — 6 commodities with location-based price modifiers and daily fluctuation
- **Branching story** — 3 chapters, 3 endings, driven by dialogue choices and mission completions
- **Faction reputation** — 3 factions with likes/dislikes, affecting prices and hostility
- **7 missions** — combat bounties, cargo deliveries, intel courier runs, and story arcs
- **Ship upgrades** — Shield Booster, Gun Mk.2, Cargo Expansion, Afterburner
- **Save/load** via localStorage with corruption fallback
- **Procedural audio** — Web Audio API SFX for lasers, explosions, and engine hum

---

## Quick Start

```bash
git clone https://github.com/janriis/vega.git
cd vega
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## Controls

| Key | Action |
|-----|--------|
| **Mouse** | Aim crosshair |
| **Click / Space** | Fire weapons |
| **W** | Boost forward |
| **A / D** | Strafe left/right |
| **S** | Brake |

On the star map, click a location to travel. On stations, click tabs and buttons to interact.

---

## Architecture

### Design Principles

- **Scenes handle rendering and input only.** All game logic lives in pure functions and a central `GameState` object.
- **Single source of truth.** Scenes never communicate directly — they read from and write to `GameState`.
- **Data-driven content.** Adding ships, items, missions, or dialogue means editing JSON files, not touching scene code.

### Project Structure

```
vega/
  index.html
  src/
    main.js                         # Phaser config, scene registry
    scenes/
      BootScene.js                  # Preload JSON, text crawl on first run
      StarMapScene.js               # System map, travel, encounter roll
      FlightScene.js                # Cockpit view, combat, AI, mouse steering
      StationScene.js               # Trade, missions, shipyard, bar tabs
      DialogueScene.js              # Branching conversation overlay
    state/
      GameState.js                  # Central state, save/load/reset
    systems/
      Economy.js                    # Price calculation, buy/sell logic
      MissionSystem.js              # Mission availability, completion checks
      FactionSystem.js              # Reputation, attack-on-sight logic
      EncounterSystem.js            # Travel encounter probability rolls
      DialogueSystem.js             # Dialogue tree traversal, flag setting
      AudioSystem.js                # Web Audio procedural SFX
    data/
      ships.json                    # Ship types and stats
      items.json                    # Tradeable goods
      locations.json                # Stations, nav points, price modifiers
      missions.json                 # Mission definitions
      dialogue.json                 # Branching conversation trees
      factions.json                 # Faction names, colors, thresholds
  tests/
    GameState.test.js               # Save/load, defaults, reset
    Economy.test.js                 # Pricing, buy/sell execution
    MissionSystem.test.js           # Availability gating, completion
    FactionSystem.test.js           # Reputation clamping, attack thresholds
    EncounterSystem.test.js         # Probability distribution
    DialogueSystem.test.js          # Node traversal, flag setting
```

### Scene Flow

```
BootScene  ──>  StarMapScene  ──>  FlightScene  ──>  StarMapScene
                   │                   │
                   v                   v
              StationScene  <──  (on dock)
                   │
                   v
              DialogueScene  ──>  StationScene
```

### Game State Model

```js
{
  player: {
    credits: 1000,
    ship: {
      type: 'arrow',
      hullHP: 100,  maxHullHP: 100,
      shieldHP: 80, maxShieldHP: 80,
      cargo: [{ itemId, quantity }],
      upgrades: ['shield_booster', ...]
    },
    location: 'station_troy',
    reputation: { military: 0, pirates: -20, merchants: 10 }
  },
  world: {
    day: 1,
    missions: { active: [], completed: [] }
  },
  story: {
    flags: { met_mira: true, ... },
    chapter: 1
  }
}
```

---

## The Vega System

### Locations

| Location | Type | Faction | Description |
|----------|------|---------|-------------|
| **Troy Station** | Station | Merchants | Bustling merchant hub. Best prices on food and medicine. |
| **Blackrock Outpost** | Station | Pirates | Rough outpost on the system edge. Cheap contraband. |
| **Fort Kepler** | Station | Military | Militia headquarters. Bounty contracts available. |
| **Kepler Belt** | Asteroid Field | — | Dense field. 85% pirate encounter rate. Rich salvage. |
| **Nav Point Echo** | Nav Point | — | Derelict beacon. Quiet. Story location for intel missions. |

### Trade Goods

| Item | Base Price | Best Buy | Best Sell |
|------|-----------|----------|-----------|
| Food Rations | 80 cr | Troy (0.9x) | Kepler (1.0x) |
| Fuel Cells | 120 cr | Blackrock | Troy |
| Medicine | 200 cr | Troy (1.1x) | Blackrock (1.4x) |
| Weapons | 400 cr | Kepler (0.8x) | Blackrock |
| Ore | 60 cr | Blackrock | Troy (1.2x) |
| Contraband | 800 cr | Blackrock (0.7x) | Blackrock |

Prices fluctuate +/-8% daily based on a deterministic hash.

### Factions

| Faction | Starting Rep | Attacks When | Likes | Dislikes |
|---------|-------------|--------------|-------|----------|
| **Vega Militia** | 0 | Below -50 | Bounties, militia cargo | Contraband, pirate siding |
| **Blackrock Raiders** | -20 | Below 0 | Contraband, ignoring pirates | Bounty kills |
| **Free Traders** | 10 | Below -80 | Trade runs, deliveries | Combat near stations |

---

## Story

**Chapter 1 — Arrival:** Arrive broke. Take trade runs and bounties. Meet Mira Chen at Troy Station's bar.

**Chapter 2 — The Conspiracy:** Mira reveals the Militia is secretly taxing pirate raids — Commander Reyes takes a 20% cut. You pick up the evidence at Nav Point Echo.

**Chapter 3 — Confrontation:** Choose your side:

- **Expose** — Leak the evidence to the Free Traders. Militia loses face, merchants and pirates gain.
- **Cover Up** — Sell the evidence back to Reyes. Militia pays well for silence.
- **Broker** — Cut a deal where everyone pays. Uncomfortable peace.

---

## Development

### Running Tests

```bash
npm test
```

29 tests across 6 test suites covering game state persistence, economy math, mission gating, faction reputation, encounter probability, and dialogue traversal.

### Building for Production

```bash
npm run build
```

Outputs to `dist/`. Serve with any static file server.

### Adding Content

**New ship:** Add entry to `src/data/ships.json` and reference it in scenes.

**New commodity:** Add to `src/data/items.json`, then add buy/sell lists in `locations.json`.

**New mission:** Add to `src/data/missions.json` with type, reward, and completion conditions.

**New dialogue:** Add nodes to `src/data/dialogue.json` and reference the opening node in `locations.json` characters array.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Engine | Phaser.js 3.80 |
| Bundler | Vite 5 |
| Tests | Vitest 1 |
| Audio | Web Audio API (procedural) |
| Storage | localStorage |
| Art | All procedural — CSS gradients, SVG shapes, Phaser graphics |

No external image or audio assets required.

---

## License

MIT
