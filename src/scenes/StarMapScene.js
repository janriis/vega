import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import { rollEncounter } from '../systems/EncounterSystem.js';

export default class StarMapScene extends Phaser.Scene {
  constructor() { super({ key: 'StarMapScene' }); }

  create() {
    this.locations = this.cache.json.get('locations');
    this.markIntelPickup();
    this.drawBackground();
    this.drawConnections();
    this.drawLocations();
    this.drawHUD();
  }

  // If the player is currently at an intel_courier mission's destination, mark it picked up.
  // This lets the mission auto-complete on the next station landing.
  markIntelPickup() {
    const allMissions = this.cache.json.get('missions');
    const loc = GameState.state.player.location;
    let dirty = false;
    GameState.state.world.missions.active.forEach(id => {
      const m = allMissions[id];
      if (m && m.type === 'intel_courier' && m.destination === loc) {
        const key = m.completionFlag + '_visited';
        if (!GameState.state.story.flags[key]) {
          GameState.state.story.flags[key] = true;
          dirty = true;
        }
      }
    });
    if (dirty) GameState.save();
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

      const dot = this.add.circle(loc.x, loc.y, radius, color, isCurrent ? 1 : 0.7);

      const nameLabel = this.add.text(loc.x, loc.y + radius + 10, loc.name, {
        fontFamily: 'monospace', fontSize: '11px', color: '#aabbcc'
      }).setOrigin(0.5, 0);

      const hitSize = Math.max(radius * 2 + 20, 44);
      const zone = this.add.zone(loc.x, loc.y, hitSize, hitSize)
        .setInteractive({ useHandCursor: true });

      if (isCurrent && loc.type === 'station') {
        // Current station: click to dock (re-enter without travel)
        zone.on('pointerover', () => nameLabel.setText(`[DOCK] ${loc.name}`));
        zone.on('pointerout', () => nameLabel.setText(loc.name));
        zone.on('pointerdown', () => this.scene.start('StationScene', { location: id }));
      } else if (isCurrent) {
        // Current non-station (nav point, asteroid field): click to launch into local flight
        zone.on('pointerover', () => nameLabel.setText(`[LAUNCH] ${loc.name}`));
        zone.on('pointerout', () => nameLabel.setText(loc.name));
        zone.on('pointerdown', () => this.launchAtCurrent(id));
      } else {
        zone.on('pointerover', () => { dot.setAlpha(1); nameLabel.setColor('#ffffff'); });
        zone.on('pointerout', () => { dot.setAlpha(0.7); nameLabel.setColor('#aabbcc'); });
        zone.on('pointerdown', () => this.travelTo(id, loc));
      }
    });
  }

  drawHUD() {
    this.hudText = this.add.text(20, 690, this.hudString(), {
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

  launchAtCurrent(locId) {
    GameState.state.world.day += 1;
    GameState.save();
    const encounter = rollEncounter(locId, locId, GameState.state.story.flags);
    this.scene.start('FlightScene', { encounter, location: locId, afterFlight: { scene: 'StarMapScene' } });
  }
}
