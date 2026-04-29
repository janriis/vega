import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import { playLaser, playExplosion } from '../systems/AudioSystem.js';

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
    this.add.rectangle(640, 695, 1280, 50, 0x0a0a18, 0.95);

    this.shieldBar = this.createBar(120, 695, 0x4488ff, ship.shieldHP / (ship.maxShieldHP || 80));
    this.hullBar = this.createBar(340, 695, 0x44bb44, ship.hullHP / (ship.maxHullHP || 100));
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
      boost: Phaser.Input.Keyboard.KeyCodes.W,
      fire: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
    this.fireTimer = 0;
    // Hide OS cursor — we draw our own crosshair
    this.sys.game.canvas.style.cursor = 'none';
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
      fireTimer: 1500,
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
    this.handlePlayerInput(dt, delta);
    this.updateEnemies(dt, delta);
    this.updateBullets(dt);
    this.updateStars(dt);
    this.updateRadar();
    this.drawCrosshair(this.input.x, this.input.y);

    if (this.enemies.length === 0 && this.encounterType === 'pirate_ambush') {
      this.completeFlight();
    }
  }

  handlePlayerInput(dt, delta) {
    const mouseX = this.input.x;
    const mouseY = this.input.y;

    // Normalised offset from screen centre (-1 to 1)
    const rawX = (mouseX - SCREEN_CX) / SCREEN_CX;
    const rawY = (mouseY - SCREEN_CY) / SCREEN_CY;

    // Small dead zone so resting mouse at centre = no drift
    const dead = 0.04;
    const dx = Math.abs(rawX) > dead ? rawX : 0;
    const dy = Math.abs(rawY) > dead ? rawY : 0;

    // W = boost; afterburner upgrade raises base speed
    const hasAfterburner = GameState.state.player.ship.upgrades.includes('afterburner');
    const baseMax = hasAfterburner ? 260 : 200;
    const maxSpeed = this.keys.boost.isDown ? baseMax * 1.5 : baseMax;

    // Mouse offset directly sets velocity (no inertia — responsive steering)
    this.playerVelX = dx * maxSpeed;
    this.playerVelY = dy * maxSpeed;

    // Move all world objects opposite to player velocity
    this.enemies.forEach(e => {
      e.wx -= this.playerVelX * dt;
      e.wy -= this.playerVelY * dt;
    });
    this.bullets.forEach(b => {
      b.wx -= this.playerVelX * dt;
      b.wy -= this.playerVelY * dt;
    });

    // Fire on Space or left mouse button
    this.fireTimer -= delta;
    const wantsFire = this.keys.fire.isDown || this.input.activePointer.isDown;
    if (wantsFire && this.fireTimer <= 0) {
      this.fireBullet();
      this.fireTimer = 300;
    }
  }

  fireBullet() {
    const SPEED = 1800;
    const mx = this.input.x;
    const my = this.input.y;
    // Lateral velocity so the bullet tracks toward the crosshair at all depths
    const bullet = {
      wx: 0, wy: 0, wz: 50,
      velX: (mx - SCREEN_CX) / FOV_SCALE * SPEED,
      velY: (my - SCREEN_CY) / FOV_SCALE * SPEED,
      velZ: SPEED,
      gfx: this.add.graphics(),
      age: 0
    };
    this.bullets.push(bullet);
    playLaser();
  }

  get bulletDamage() {
    return GameState.state.player.ship.upgrades.includes('gun_mk2') ? 37 : 25;
  }

  updateBullets(dt) {
    this.bullets = this.bullets.filter(b => {
      b.wx += (b.velX || 0) * dt;
      b.wy += (b.velY || 0) * dt;
      b.wz += b.velZ * dt;
      b.age += dt;

      if (b.wz > 2000 || b.age > 2) {
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
            this.hitEnemy(e, this.bulletDamage);
            b.wz = -1; // mark for removal
          }
        });
      }
      return b.wz >= 0;
    });
  }

  hitEnemy(enemy, damage) {
    if (enemy.shieldHP > 0) {
      const overflow = Math.max(0, damage - enemy.shieldHP);
      enemy.shieldHP = Math.max(0, enemy.shieldHP - damage);
      if (overflow > 0) enemy.hullHP = Math.max(0, enemy.hullHP - overflow);
    } else {
      enemy.hullHP = Math.max(0, enemy.hullHP - damage);
    }
    if (enemy.hullHP <= 0) this.destroyEnemy(enemy);
    else if (enemy.hullHP / enemy.data.hullHP < 0.2) enemy.state = 'flee';
    else if (enemy.state === 'approach') enemy.state = 'attack';
  }

  destroyEnemy(enemy) {
    playExplosion();
    // Explosion flash
    const flash = this.add.circle(SCREEN_CX, SCREEN_CY, 80, 0xff6600, 0.7);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 600, onComplete: () => flash.destroy() });

    const loot = Phaser.Math.Between(100, 400);
    GameState.state.player.credits += loot;
    this.showMessage(`PIRATE DESTROYED  +${loot} credits`);

    // Set bounty kill flags for matching active missions
    const allMissions = this.cache.json.get('missions');
    GameState.state.world.missions.active.forEach(missionId => {
      const m = allMissions[missionId];
      if (m && m.type === 'combat_bounty' && m.target?.shipType === enemy.type) {
        GameState.state.story.flags[m.completionFlag + '_kill'] = true;
      }
    });

    enemy.gfx.destroy();
    enemy.bracket.destroy();
    this.enemies = this.enemies.filter(e => e !== enemy);
  }

  updateEnemies(dt, delta) {
    const toRemove = [];
    this.enemies.forEach(e => {
      switch (e.state) {
        case 'approach':
          e.wz -= 150 * dt;
          if (e.wz < 300) e.state = 'attack';
          break;
        case 'attack':
          e.wx += Math.sin(this.time.now * 0.001) * 80 * dt;
          e.wy += Math.cos(this.time.now * 0.0013) * 60 * dt;
          e.wz = Phaser.Math.Clamp(e.wz - 30 * dt, 200, 400);
          e.fireTimer -= delta;
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
            toRemove.push(e);
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
    if (toRemove.length > 0) {
      this.enemies = this.enemies.filter(e => !toRemove.includes(e));
    }
  }

  enemyShoot(enemy) {
    const ship = GameState.state.player.ship;
    const damage = 15;
    const overflow = Math.max(0, damage - ship.shieldHP);
    ship.shieldHP = Math.max(0, ship.shieldHP - damage);
    if (overflow > 0) ship.hullHP = Math.max(0, ship.hullHP - overflow);
    this.updateBar(this.shieldBar, ship.shieldHP / (ship.maxShieldHP || 80));
    this.updateBar(this.hullBar, ship.hullHP / (ship.maxHullHP || 100));

    const flash = this.add.rectangle(640, 360, 1280, 720, 0xff0000, 0.15);
    this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });

    if (ship.hullHP <= 0) this.playerDied();
  }

  playerDied() {
    this.flightDone = true;
    this.sys.game.canvas.style.cursor = 'default';
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
    this.sys.game.canvas.style.cursor = 'default';
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
