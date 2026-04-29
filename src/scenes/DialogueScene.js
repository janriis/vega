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
    this.add.rectangle(640, 490, 1000, 280, 0x080818, 0.97);
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
