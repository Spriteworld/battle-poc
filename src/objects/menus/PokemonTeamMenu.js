import Phaser from 'phaser';
import { Menu } from '@Objects';

const PANEL_W = 800;
const PANEL_H = 600;
const PAD_X = 24;
const PAD_Y = 20;

const CELL_H  = 36;
const MAX_VIS = Math.floor((PANEL_H - PAD_Y - 10) / CELL_H);

/** Single-column Pokémon party list. @extends Menu */
export default class PokemonTeamMenu extends Menu {
  constructor(scene, x, y) {
    super(scene, x, y, {
      columns: 1,
      cellWidth: PANEL_W - PAD_X * 2,
      cellHeight: CELL_H,
      padX: PAD_X,
      padY: PAD_Y,
      maxVisible: MAX_VIS,
    });
    this.name = 'PokemonTeamMenu';
    this._drawPanel();
  }

  _drawPanel() {
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0x1a1a3a);
    bg.fillRect(0, 0, PANEL_W, PANEL_H);
    bg.lineStyle(4, 0x181818);
    bg.strokeRect(0, 0, PANEL_W, PANEL_H);
    this.addAt(bg, 0);
    this._createScrollArrows(PANEL_W, PANEL_H);
  }
}
