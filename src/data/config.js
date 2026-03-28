import Phaser from 'phaser'
import Scenes from '@Scenes';

const config = {
  parent: 'game-container',
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,
  disableContextMenu: true,
  fps: {
    target: 30,
    forceSetTimeOut: true
  },
  physics: {
    default: 'arcade',
    arcade: {debug: true}
  },
  plugins: {

  },
  scene: [Scenes.Preload],
  callbacks: {
    postBoot: (game) => {
      game.canvas.style.width = '100%';
      game.canvas.style.height = '100%';
      game.canvas.style['object-fit'] = 'contain';
      window.dispatchEvent(new Event('resize'));
    }
  }
};

export default config;
