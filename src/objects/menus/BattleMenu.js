import Phaser from 'phaser';
import { Menu } from '@Objects';

// ─── Layout constants (relative to the menu container origin) ──────────────
const PANEL_W = 310;
const PANEL_H = 230;
const COLUMNS = 2;
const CELL_W = 140;
const CELL_H = 90;
const PAD_X = 20;
// Vertical centering: (230 - 2*90) / 2 ≈ 25
const PAD_Y = 28;

/**
 * Gen 3-style 2×2 action menu (FIGHT / BAG / POKéMON / RUN).
 *
 * Draws its own dark background panel and positions items in a grid.
 * Intended to be placed at the right edge of the bottom UI strip.
 *
 * @extends Menu
 */
export default class BattleMenu extends Menu {
  constructor(scene, x, y) {
    super(scene, x, y, {
      columns: COLUMNS,
      cellWidth: CELL_W,
      cellHeight: CELL_H,
      padX: PAD_X,
      padY: PAD_Y,
    });
    this.name = 'BattleMenu';
    this._drawPanel();
  }

  _drawPanel() {
    // Dark navy panel — drawn into the container so it sits behind text items.
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0x101878);
    bg.fillRect(0, 0, PANEL_W, PANEL_H);
    bg.lineStyle(4, 0x181818);
    bg.strokeRect(0, 0, PANEL_W, PANEL_H);

    // Thin divider lines between cells
    bg.lineStyle(1, 0x2030a0);
    bg.lineBetween(PANEL_W / 2, 8, PANEL_W / 2, PANEL_H - 8);     // vertical
    bg.lineBetween(8, PANEL_H / 2, PANEL_W - 8, PANEL_H / 2);      // horizontal

    // addAt index 0 so it renders behind the MenuItem text objects
    this.addAt(bg, 0);
  }
}
