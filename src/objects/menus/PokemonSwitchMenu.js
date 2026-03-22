import Phaser from 'phaser';
import { Menu } from '@Objects';

const PANEL_W = 310;
const PANEL_H = 230;
const PAD_X = 16;
const PAD_Y = 20;

/** Switch / Details / Cancel options for a selected Pokémon. @extends Menu */
export default class PokemonSwitchMenu extends Menu {
  constructor(scene, x, y) {
    super(scene, x, y, {
      columns: 1,
      cellWidth: PANEL_W - PAD_X * 2,
      cellHeight: 40,
      padX: PAD_X,
      padY: PAD_Y,
    });
    this.name = 'PokemonSwitchMenu';
    this._drawPanel();
  }

  _drawPanel() {
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0x1a1a3a);
    bg.fillRect(0, 0, PANEL_W, PANEL_H);
    bg.lineStyle(4, 0x181818);
    bg.strokeRect(0, 0, PANEL_W, PANEL_H);
    this.addAt(bg, 0);
  }
}
