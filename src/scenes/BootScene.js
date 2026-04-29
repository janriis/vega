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
    // Check localStorage availability
    try {
      localStorage.setItem('__test__', '1');
      localStorage.removeItem('__test__');
    } catch (e) {
      this.add.text(640, 680, '⚠ Save/load unavailable in this browser mode', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ff8844'
      }).setOrigin(0.5);
    }

    // Validate required JSON keys on boot
    const requiredKeys = { ships: ['arrow'], items: ['food', 'fuel'], factions: ['military', 'pirates', 'merchants'] };
    Object.entries(requiredKeys).forEach(([cacheKey, keys]) => {
      const data = this.cache.json.get(cacheKey);
      keys.forEach(k => {
        if (!data[k]) console.warn(`[Boot] Missing expected key "${k}" in ${cacheKey}.json`);
      });
    });

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
