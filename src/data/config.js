import Phaser from 'phaser'
import * as Scenes from '@Scenes';

const config = {
  parent: 'app',
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  pixelArt: true,
  disableContextMenu: true,
  fps: {
    target: 30,
    forceSetTimeOut: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {debug: true}
  },
  plugins: {

  },
  scene: Object.values(Scenes)
};

export default config;
