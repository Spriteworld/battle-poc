import Phaser from 'phaser';
import registerTiledJSONExternalLoader from 'phaser-tiled-json-external-loader';

import '@/assets/app.css';

import { config } from '@Data';
import { Game } from '@Objects';

registerTiledJSONExternalLoader(Phaser);

export function createGame() {
  window.spriteworld = new Game(config);
  return window.spriteworld;
}
