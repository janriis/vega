import Phaser from 'phaser';
import GameState from '../state/GameState.js';
import { getPrice, canBuy, canSell, executeBuy, executeSell } from '../systems/Economy.js';
import { getAvailableMissions, completeMission, isMissionComplete } from '../systems/MissionSystem.js';

const TABS = ['TRADE', 'MISSIONS', 'SHIPYARD', 'BAR'];
const UPGRADES = [
  { id: 'shield_booster', name: 'Shield Booster', cost: 1500, description: '+40 max shields', apply: s => { s.ship.maxShieldHP = (s.ship.maxShieldHP || 80) + 40; s.ship.shieldHP = Math.min(s.ship.shieldHP + 40, s.ship.maxShieldHP); } },
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
      const sells = canBuy(itemId, this.locationId, this.locations);
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
    // Use a copy to avoid mutation during iteration
    const activeCopy = [...state.world.missions.active];
    activeCopy.forEach(missionId => {
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
