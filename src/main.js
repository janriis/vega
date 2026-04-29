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
