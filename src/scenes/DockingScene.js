import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import { playEngineHum } from '../systems/AudioSystem.js';

// Cinematic transition between space and a station. Two directions:
//   arrive — ship flies in from far away, scales down, parks at the station
//   depart — ship undocks, scales up, flies off-screen
// `data.then` is the next scene to start once the animation completes (or is skipped).
const DURATION = 2500;

export default class DockingScene extends Phaser.Scene {
  constructor() { super({ key: 'DockingScene' }); }

  init(data) {
    this.direction = data.direction === 'depart' ? 'depart' : 'arrive';
    this.stationId = data.stationId || GameState.state.player.location;
    this.then = data.then || { scene: 'StarMapScene' };
    this.transitioned = false;
  }

  create() {
    const locations = this.cache.json.get('locations');
    this.station = locations[this.stationId] || { name: 'Station' };

    this.drawBackground();
    this.drawStation();
    this.drawShip();
    this.drawHeader();
    this.startAnimation();
    this.setupSkip();
    playEngineHum(true);
  }

  drawBackground() {
    this.add.rectangle(640, 360, 1280, 720, 0x000005);
    // Slow drifting starfield (parallax depth)
    this.stars = [];
    for (let i = 0; i < 180; i++) {
      const x = Phaser.Math.Between(0, 1280);
      const y = Phaser.Math.Between(0, 720);
      const size = Phaser.Math.FloatBetween(0.5, 1.8);
      const alpha = Phaser.Math.FloatBetween(0.25, 0.9);
      const speed = Phaser.Math.FloatBetween(0.15, 0.6);
      const gfx = this.add.circle(x, y, size, 0xffffff, alpha);
      this.stars.push({ gfx, speed, x, y });
    }
    // Nebula glow
    const g = this.add.graphics();
    g.fillStyle(0x110033, 0.25);
    g.fillEllipse(900, 200, 700, 400);
    g.fillStyle(0x001a33, 0.18);
    g.fillEllipse(300, 550, 500, 300);
  }

  drawStation() {
    const cx = 850, cy = 360;
    const factions = this.cache.json.get('factions');
    const colorHex = factions?.[this.station.faction]?.color?.replace('#', '') || '4488ff';
    const color = parseInt(colorHex, 16);

    // Soft halo
    const halo = this.add.circle(cx, cy, 240, color, 0.06);
    this.tweens.add({ targets: halo, scaleX: 1.08, scaleY: 1.08, alpha: 0.1, duration: 1800, yoyo: true, repeat: -1 });

    // Hex body
    const body = this.add.graphics();
    body.fillStyle(0x10131e, 1);
    body.lineStyle(2, color, 0.85);
    const r = 140;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 - 30) * Math.PI / 180;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    body.fillPoints(pts, true);
    body.strokePoints(pts, true, true);

    // Inner concentric rings
    body.lineStyle(1, color, 0.55);
    body.strokeCircle(cx, cy, 88);
    body.lineStyle(1, color, 0.3);
    body.strokeCircle(cx, cy, 56);

    // Spokes
    body.lineStyle(1, color, 0.25);
    for (let i = 0; i < 6; i++) {
      const a = (i * 60) * Math.PI / 180;
      body.lineBetween(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56, cx + Math.cos(a) * 130, cy + Math.sin(a) * 130);
    }

    // Core
    const core = this.add.circle(cx, cy, 14, color, 0.7);
    this.tweens.add({ targets: core, scaleX: 1.3, scaleY: 1.3, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });

    // Blinking lights on the hex corners
    pts.forEach((p, i) => {
      const light = this.add.circle(p.x, p.y, 3.5, 0xff8844, 1);
      this.tweens.add({
        targets: light, alpha: 0.15,
        duration: 700, yoyo: true, repeat: -1, delay: i * 110
      });
    });

    // Docking bay marker (small ring on the side facing the ship)
    const bayX = cx - r * 0.85;
    const bayY = cy + r * 0.45;
    this.bay = { x: bayX, y: bayY };
    const bayRing = this.add.circle(bayX, bayY, 9, 0x44ff88, 0.4).setStrokeStyle(1.5, 0x44ff88, 0.9);
    this.tweens.add({ targets: bayRing, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    this.stationCenter = { x: cx, y: cy };
  }

  drawShip() {
    const g = this.add.graphics();
    const draw = (size, glow) => {
      g.clear();
      g.fillStyle(0x4488ff, glow);
      g.fillCircle(0, size * 0.7, size * 0.5);
      g.fillStyle(0xaabbcc, 1);
      g.fillTriangle(0, -size, size * 0.7, size * 0.6, -size * 0.7, size * 0.6);
      g.lineStyle(1, 0xddeeff, 0.9);
      g.strokeTriangle(0, -size, size * 0.7, size * 0.6, -size * 0.7, size * 0.6);
    };
    draw(14, 0.6);
    this.ship = g;

    // Engine trail (a few particles trailing behind)
    this.trailDots = [];
    for (let i = 0; i < 6; i++) {
      const dot = this.add.circle(0, 0, 3 - i * 0.4, 0x44aaff, 0.4 - i * 0.05);
      this.trailDots.push({ gfx: dot, lagSteps: i + 1 });
    }
    this.shipPath = []; // history of recent ship positions for the trail

    if (this.direction === 'arrive') {
      this.ship.setPosition(120, 620);
    } else {
      this.ship.setPosition(this.bay.x, this.bay.y);
      this.ship.setScale(0.35);
    }
  }

  drawHeader() {
    const verb = this.direction === 'arrive' ? 'DOCKING WITH' : 'DEPARTING';
    this.add.text(640, 70, `${verb}  ${this.station.name?.toUpperCase() || ''}`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#88ccff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.statusText = this.add.text(640, 660, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#557799'
    }).setOrigin(0.5);

    this.add.text(640, 700, '[click or SPACE to skip]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#334455'
    }).setOrigin(0.5);
  }

  setStatus(t) { this.statusText.setText(t); }

  startAnimation() {
    if (this.direction === 'arrive') {
      this.setStatus('APPROACH VECTOR LOCKED');
      this.tweens.add({
        targets: this.ship,
        x: this.bay.x, y: this.bay.y,
        scaleX: 0.35, scaleY: 0.35,
        duration: DURATION,
        ease: 'Quad.easeIn',
        onComplete: () => this.finish()
      });
      this.time.delayedCall(1100, () => this.setStatus('DOCK CLAMPS ENGAGED'));
      this.time.delayedCall(1900, () => this.setStatus('AIRLOCK PRESSURIZED'));
    } else {
      this.setStatus('AIRLOCK SEALED');
      this.time.delayedCall(500, () => this.setStatus('DOCK CLAMPS RELEASED'));
      this.time.delayedCall(1400, () => this.setStatus('DEPARTURE CLEAR'));
      this.tweens.add({
        targets: this.ship,
        x: 120, y: 620,
        scaleX: 1, scaleY: 1,
        duration: DURATION,
        ease: 'Quad.easeOut',
        delay: 200,
        onComplete: () => this.finish()
      });
    }
  }

  setupSkip() {
    const skip = () => this.finish();
    this.input.once('pointerdown', skip);
    this.input.keyboard.once('keydown-SPACE', skip);
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Drift stars subtly (depth illusion)
    const dir = this.direction === 'arrive' ? 1 : -1;
    this.stars.forEach(s => {
      s.x -= s.speed * 30 * dt * dir;
      if (s.x < -10) s.x += 1300;
      if (s.x > 1290) s.x -= 1300;
      s.gfx.x = s.x;
    });

    // Engine trail follows the ship
    if (this.ship) {
      this.shipPath.unshift({ x: this.ship.x, y: this.ship.y });
      if (this.shipPath.length > 30) this.shipPath.pop();
      this.trailDots.forEach(d => {
        const p = this.shipPath[d.lagSteps] || this.shipPath[this.shipPath.length - 1];
        if (p) d.gfx.setPosition(p.x, p.y + 8 * (this.ship.scaleY || 1));
      });
    }
  }

  finish() {
    if (this.transitioned) return;
    this.transitioned = true;
    this.tweens.killAll();
    playEngineHum(false);
    this.scene.start(this.then.scene, this.then);
  }

  shutdown() {
    playEngineHum(false);
  }
}
