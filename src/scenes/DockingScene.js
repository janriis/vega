import Phaser from 'phaser';
import * as THREE from 'three';
import GameState from '../state/GameState.js';
import { playEngineHum } from '../systems/AudioSystem.js';
import { generateProceduralShip, disposeShip } from '../systems/ShipModel.js';

// Cinematic transition between space and a station. Two directions:
//   arrive — ship flies in from far away, scales down, parks at the station
//   depart — ship undocks, scales up, flies off-screen
// Three.js renders the ship on a transparent overlay above the Phaser canvas.
const DURATION = 2500;
const W = 1280;
const H = 720;

// Endpoint positions in Three world space. Camera sits at (0, 0, 8) looking at origin.
// Higher Z = closer/larger, lower Z = farther/smaller.
const FAR_POS = { x: -5, y: -2, z: 3 };   // lower-left, foreground
const DOCK_POS = { x: 3, y: 1, z: -4 };   // upper-right, near the (Phaser-drawn) station

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
    this.drawHeader();
    this.setupThree();
    this.startAnimation();
    this.setupSkip();
    playEngineHum(true);

    this.events.once('shutdown', () => this.cleanupThree());
  }

  drawBackground() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x000005);
    this.stars = [];
    for (let i = 0; i < 180; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const size = Phaser.Math.FloatBetween(0.5, 1.8);
      const alpha = Phaser.Math.FloatBetween(0.25, 0.9);
      const speed = Phaser.Math.FloatBetween(0.15, 0.6);
      const gfx = this.add.circle(x, y, size, 0xffffff, alpha);
      this.stars.push({ gfx, speed, x, y });
    }
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
    this.stationColor = parseInt(colorHex, 16);
    const color = this.stationColor;

    const halo = this.add.circle(cx, cy, 240, color, 0.06);
    this.tweens.add({ targets: halo, scaleX: 1.08, scaleY: 1.08, alpha: 0.1, duration: 1800, yoyo: true, repeat: -1 });

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

    body.lineStyle(1, color, 0.55);
    body.strokeCircle(cx, cy, 88);
    body.lineStyle(1, color, 0.3);
    body.strokeCircle(cx, cy, 56);

    body.lineStyle(1, color, 0.25);
    for (let i = 0; i < 6; i++) {
      const a = (i * 60) * Math.PI / 180;
      body.lineBetween(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56, cx + Math.cos(a) * 130, cy + Math.sin(a) * 130);
    }

    const core = this.add.circle(cx, cy, 14, color, 0.7);
    this.tweens.add({ targets: core, scaleX: 1.3, scaleY: 1.3, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });

    pts.forEach((p, i) => {
      const light = this.add.circle(p.x, p.y, 3.5, 0xff8844, 1);
      this.tweens.add({
        targets: light, alpha: 0.15,
        duration: 700, yoyo: true, repeat: -1, delay: i * 110
      });
    });

    const bayX = cx - r * 0.85;
    const bayY = cy + r * 0.45;
    const bayRing = this.add.circle(bayX, bayY, 9, 0x44ff88, 0.4).setStrokeStyle(1.5, 0x44ff88, 0.9);
    this.tweens.add({ targets: bayRing, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  }

  drawHeader() {
    const verb = this.direction === 'arrive' ? 'DOCKING WITH' : 'DEPARTING';
    this.add.text(W / 2, 70, `${verb}  ${this.station.name?.toUpperCase() || ''}`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#88ccff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.statusText = this.add.text(W / 2, 660, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#557799'
    }).setOrigin(0.5);

    this.add.text(W / 2, 700, '[click or SPACE to skip]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#334455'
    }).setOrigin(0.5);
  }

  setupThree() {
    const phaserCanvas = this.sys.game.canvas;
    const overlay = document.createElement('canvas');
    overlay.width = W;
    overlay.height = H;
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '5';
    phaserCanvas.parentElement.appendChild(overlay);
    this.alignOverlay(phaserCanvas, overlay);
    this.threeOverlay = overlay;
    this.alignHandler = () => this.alignOverlay(phaserCanvas, overlay);
    window.addEventListener('resize', this.alignHandler);

    this.threeRenderer = new THREE.WebGLRenderer({ canvas: overlay, alpha: true, antialias: true });
    this.threeRenderer.setSize(W, H, false);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
    this.threeRenderer.setClearColor(0x000000, 0);

    this.threeScene = new THREE.Scene();
    this.threeCamera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    this.threeCamera.position.set(0, 0, 8);
    this.threeCamera.lookAt(0, 0, 0);

    // Lighting
    this.threeScene.add(new THREE.AmbientLight(0x223344, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 5, 6);
    this.threeScene.add(key);
    const rim = new THREE.DirectionalLight(0x4488ff, 0.6);
    rim.position.set(-4, -2, -3);
    this.threeScene.add(rim);
    // Faction-coloured accent from the station's direction (upper-right)
    const accent = new THREE.PointLight(this.stationColor, 1.4, 30);
    accent.position.set(6, 3, -4);
    this.threeScene.add(accent);

    this.threeShip = generateProceduralShip();
    this.threeScene.add(this.threeShip);

    // Orient and place the ship for the chosen direction
    if (this.direction === 'arrive') {
      this.threeShip.position.set(FAR_POS.x, FAR_POS.y, FAR_POS.z);
      this.threeShip.lookAt(DOCK_POS.x, DOCK_POS.y, DOCK_POS.z);
    } else {
      this.threeShip.position.set(DOCK_POS.x, DOCK_POS.y, DOCK_POS.z);
      this.threeShip.lookAt(FAR_POS.x, FAR_POS.y, FAR_POS.z);
    }
    // Slight bank for visual flair
    this.threeShip.rotateZ(0.18);
  }

  alignOverlay(phaserCanvas, overlay) {
    const r = phaserCanvas.getBoundingClientRect();
    overlay.style.left = `${r.left}px`;
    overlay.style.top = `${r.top}px`;
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
  }

  setStatus(t) { this.statusText.setText(t); }

  startAnimation() {
    const start = this.direction === 'arrive' ? FAR_POS : DOCK_POS;
    const end = this.direction === 'arrive' ? DOCK_POS : FAR_POS;

    if (this.direction === 'arrive') {
      this.setStatus('APPROACH VECTOR LOCKED');
      this.time.delayedCall(1100, () => this.setStatus('DOCK CLAMPS ENGAGED'));
      this.time.delayedCall(1900, () => this.setStatus('AIRLOCK PRESSURIZED'));
    } else {
      this.setStatus('AIRLOCK SEALED');
      this.time.delayedCall(500, () => this.setStatus('DOCK CLAMPS RELEASED'));
      this.time.delayedCall(1400, () => this.setStatus('DEPARTURE CLEAR'));
    }

    this.threeShip.position.set(start.x, start.y, start.z);
    this.tweens.add({
      targets: this.threeShip.position,
      x: end.x, y: end.y, z: end.z,
      duration: DURATION,
      ease: this.direction === 'arrive' ? 'Quad.easeIn' : 'Quad.easeOut',
      delay: this.direction === 'depart' ? 200 : 0,
      onComplete: () => this.finish()
    });
  }

  setupSkip() {
    const skip = () => this.finish();
    this.input.once('pointerdown', skip);
    this.input.keyboard.once('keydown-SPACE', skip);
  }

  update(time, delta) {
    const dt = delta / 1000;
    const dir = this.direction === 'arrive' ? 1 : -1;
    this.stars.forEach(s => {
      s.x -= s.speed * 30 * dt * dir;
      if (s.x < -10) s.x += 1300;
      if (s.x > 1290) s.x -= 1300;
      s.gfx.x = s.x;
    });

    if (this.threeShip) {
      // Slow lazy spin for life — small amount on the local Y axis (yaw)
      this.threeShip.rotateY(0.3 * dt);
    }
    if (this.threeRenderer) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  finish() {
    if (this.transitioned) return;
    this.transitioned = true;
    this.tweens.killAll();
    playEngineHum(false);
    this.scene.start(this.then.scene, this.then);
  }

  cleanupThree() {
    playEngineHum(false);
    if (this.alignHandler) window.removeEventListener('resize', this.alignHandler);
    if (this.threeShip) {
      disposeShip(this.threeShip);
      this.threeScene.remove(this.threeShip);
      this.threeShip = null;
    }
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
      this.threeRenderer = null;
    }
    if (this.threeOverlay) {
      this.threeOverlay.remove();
      this.threeOverlay = null;
    }
  }
}
