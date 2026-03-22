import Phaser from 'phaser';
import { Menu } from '@Objects';

const PANEL_W = 310;
const PANEL_H = 230;
const CELL_H = 36;
const PAD_X = 16;
const PAD_Y = 20;

/**
 * Gen 3-style move list menu.
 *
 * Renders as a single-column scrollable list inside a dark panel, sharing the
 * same position as BattleMenu (only one is visible at a time).
 *
 * Items are added by the state as formatted strings, e.g.
 * "Tackle (35pp / 35pp)" or "Cancel".
 *
 * @extends Menu
 */
export default class AttackMenu extends Menu {
  constructor(scene, x, y) {
    super(scene, x, y, {
      columns: 1,
      cellWidth: PANEL_W - PAD_X * 2,
      cellHeight: CELL_H,
      padX: PAD_X,
      padY: PAD_Y,
    });
    this.name = 'AttackMenu';
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
