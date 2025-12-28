/**
 * Main entry point for the Phaser game.
 * Sets up the game configuration and initializes the game instance.
 */
import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { GridConfig, ColorConfig, initTheme } from './constants';

// Initialize theme from system preference once at app startup
initTheme();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GridConfig.CANVAS_WIDTH,
  height: GridConfig.CANVAS_HEIGHT,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  parent: 'app',
  backgroundColor: ColorConfig.GAME_BG_STR,
  scene: [GameScene]
};

new Phaser.Game(config);
