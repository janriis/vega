# Space Trading & Combat Game — Design Spec
**Date:** 2026-04-28  
**Status:** Approved

---

## Overview

A cockpit-view space trading and combat game in the style of Wing Commander: Privateer, built in Phaser.js and running entirely in the browser. The player flies between stations in a single star system, trades goods, takes missions, fights pirates, and uncovers a faction conspiracy. Dark, atmospheric visual style — no photo assets, all rendered with CSS/SVG gradients and glows.

**Target:** Playable prototype — a complete start-to-finish experience within one star system.

---

## Tech Stack

- **Engine:** Phaser.js 3 (browser, HTML5 Canvas)
- **Language:** JavaScript (ES modules)
- **Art:** Dark atmospheric — SVG ships, CSS gradient nebulas, glowing HUD elements. No external image assets required.
- **Storage:** `localStorage` for save/load
- **Audio:** Web Audio API SFX only (laser, explosion, engine hum). No music in prototype.

---

## Architecture

### Principle
Phaser scenes handle rendering and input only. All game logic lives in a central `GameState` object. Scenes never communicate directly — they read from and write to `GameState`. Adding content means editing JSON files, not touching scene code.

### File Structure

```
/Space-game
  index.html
  /src
    main.js                  ← Phaser config, scene registry
    /scenes
      BootScene.js           ← loading screen, asset preload
      StarMapScene.js        ← system map, destination selection
      FlightScene.js         ← cockpit view, free flight + combat
      StationScene.js        ← docked UI: trade, missions, upgrades, bar
      DialogueScene.js       ← conversation overlay (layered over other scenes)
    /state
      GameState.js           ← single source of truth, save/load logic
    /data
      ships.json             ← ship types and stats
      items.json             ← tradeable goods definitions
      locations.json         ← stations, inventories, price modifiers
      missions.json          ← mission definitions and rewards
      dialogue.json          ← branching conversation trees
      factions.json          ← faction names, default relationships
  /assets
    /audio                   ← SFX files
```

---

## Game State Model

```js
GameState = {
  player: {
    credits: 1000,
    ship: {
      type: 'arrow',          // key into ships.json
      hullHP: 100,
      shieldHP: 80,
      cargo: [],              // [{ itemId, quantity }]
      upgrades: []            // ['shield_booster', 'gun_mk2', ...]
    },
    location: 'station_troy', // current location key
    reputation: {
      military: 0,
      pirates: -20,
      merchants: 10
    }
  },
  world: {
    day: 1,                   // advances on each travel leg
    prices: {},               // { locationId: { itemId: price } }
    missions: {
      available: [],          // mission objects available at current station
      active: [],             // accepted missions in progress
      completed: []           // completed mission IDs
    }
  },
  story: {
    flags: {},                // { met_contact: true, conspiracy_revealed: false, ... }
    chapter: 1
  }
}
```

---

## Scenes

### BootScene
Preloads all JSON data files and audio assets. Shows a loading bar. Transitions to StarMapScene on complete.

### StarMapScene
Overhead 2D map of the star system. Displays 5 locations: 3 stations, 1 asteroid field, 1 nav point. Player clicks a destination to initiate travel. Travel cost is time (advances `world.day`) and triggers a random encounter roll. Encounter outcomes: empty space, pirate ambush, scripted story event. All encounters launch FlightScene with a configuration object.

**Asteroid Field:** A dangerous travel zone — high encounter rate, no docking. Flying through it is a shortcut between two stations but guarantees a pirate encounter. Rich salvage drops.

**Nav Point:** An empty waypoint in deep space — a derelict beacon. Low encounter rate. Used as a story location in Chapter 2 (dead-drop mission). No docking.

**First-time flow:** On the very first launch (no save data), BootScene shows a brief text crawl setting the scene before transitioning to StarMapScene.

### FlightScene
The core cockpit experience. Renders:
- Scrolling star field (parallax layers)
- Enemy ships as SVG sprites that scale with distance (pseudo-3D depth)
- HUD overlay: shields, hull, cargo, radar blip, targeting bracket
- Weapon fire (laser bolts, visual trail)

**Controls:** WASD thrust/strafe, mouse aim, Space to fire, E to interact/dock.

**Combat AI:** State machine per enemy — `patrol → detect → approach → attack → flee`. Enemies flee below 20% HP. Pirates drop credits or cargo on death.

**Docking:** Flying close to a station and pressing E triggers a docking animation and launches StationScene.

### StationScene
Full-screen UI rendered with HTML/CSS overlay on a Phaser canvas background. Four tabs:

- **Trade** — commodity list with buy/sell prices. Prices fluctuate ±10% per day based on supply/demand modifiers in `locations.json`.
- **Missions** — 2–3 available jobs per station, refreshed daily. Types: combat bounty, cargo delivery, intel courier, story mission.
- **Shipyard** — purchasable upgrades: Shield Booster, Gun Mk2, Cargo Expansion, Afterburner. Each has a credit cost and modifies ship stats in GameState.
- **Bar** — list of present characters. Clicking one launches DialogueScene.

### DialogueScene
Rendered as an overlay panel. Displays: character portrait (SVG), character name, dialogue text, and 1–4 choice buttons. Each node in `dialogue.json` specifies:
- `speaker` — character ID
- `text` — what they say
- `choices` — array of `{ label, next, setFlag?, reputationDelta?: { factionId, amount } }`

Choices can set story flags and adjust faction reputation. Dialogue ends when a node has no choices (terminal node).

---

## Data Formats

### ships.json
```json
{
  "arrow": { "name": "Arrow", "hullHP": 100, "shieldHP": 80, "speed": 300, "guns": 1, "cargoSlots": 20 },
  "pirate_razor": { "name": "Razor", "hullHP": 70, "shieldHP": 40, "speed": 350, "guns": 2, "cargoSlots": 0 },
  "militia_hawk": { "name": "Hawk", "hullHP": 120, "shieldHP": 100, "speed": 260, "guns": 2, "cargoSlots": 0 }
}
```

### items.json
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

### dialogue.json (node graph)
```json
{
  "contact_intro": {
    "speaker": "Mira Chen",
    "text": "You're the new pilot they sent? Good. I need someone the Militia doesn't know yet.",
    "choices": [
      { "label": "What's the job?", "next": "contact_job" },
      { "label": "Who are you?", "next": "contact_who" },
      { "label": "Not interested.", "next": "contact_dismiss" }
    ]
  }
}
```

---

## Story Outline

**Setting:** The Vega system — a frontier system on the edge of Militia control. Three stations: Troy Station (merchant hub), Blackrock Outpost (pirate-adjacent), Fort Kepler (Militia base).

**Chapter 1 — Arrival:** Player arrives broke, takes basic trade runs and bounties to earn credits. Meets Mira Chen (a smuggler) at Troy Station's bar.

**Chapter 2 — The Conspiracy:** Mira hints that the Militia is secretly taxing pirate raids — taking a cut of stolen cargo. Intel missions reveal the connection.

**Chapter 3 — Confrontation:** Player must choose a side: expose the Militia (pirates/merchants gain power), side with the Militia (suppress the evidence), or broker a deal. Each ending changes station prices and NPC dialogue permanently.

**Story flags drive progression:** Chapters advance when specific flags are set via dialogue choices and mission completions.

---

## Factions

| Faction | Base Rep | Likes | Dislikes |
|---|---|---|---|
| Military | 0 | Completing bounties, carrying militia cargo | Trading contraband, siding with pirates |
| Pirates | -20 | Delivering contraband, ignoring pirate activity | Completing bounty missions |
| Merchants | 10 | Trade runs, delivering medicine/food | Combat near stations |

Reputation affects: mission availability, station prices (merchants charge less at +rep), and whether enemy ships attack on sight.

---

## Prototype Scope

### In
- 1 star system, 5 locations
- 3 ship types (1 player, 2 enemy)
- 6 tradeable goods
- 10–15 missions
- 3 factions with reputation
- 4–5 named characters
- Full story arc (3 chapters, 3 endings)
- Save/load via localStorage
- SFX

### Out (post-prototype)
- Multiple star systems
- Multiplayer
- Boarding mechanics
- Procedural generation
- Voice acting
- Music
- Advanced economy simulation
- Ship hull customisation

### Definition of Done
> The player can launch, fly to a station, take a mission, fight pirates en route, dock, sell cargo, buy an upgrade, and experience the full story arc from arrival to ending — without breaking.

---

## Error Handling

- If `localStorage` is unavailable, game runs without save/load and shows a warning on boot.
- If a dialogue node references a missing `next` key, the conversation ends gracefully (no choices shown).
- If GameState is corrupted on load, boot falls back to a fresh save with a console warning.
- All JSON data is validated on boot; missing required fields log warnings and use defaults.
