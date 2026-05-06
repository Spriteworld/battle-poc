import Phaser from 'phaser';
import { Menu } from '@Objects';

const PANEL_W = 310;
const PANEL_H = 230;

// List mode — single column, used by LearnMove.
const LIST_CELL_H = 36;
const LIST_PAD_X  = 16;
const LIST_PAD_Y  = 20;

// Grid mode — 2×2 move slots, used by PlayerAttack. Move details are shown
// outside the panel via MoveInfoOverlay (drawn over the textbox area).
const GRID_CELL_W = 140;
const GRID_CELL_H = 48;
const GRID_PAD_X  = 16;
// Vertical centering: (230 - 2*48) / 2 ≈ 67
const GRID_PAD_Y  = 67;

/**
 * Gen 3-style move menu with two layouts:
 *
 *  - **list mode** (default): single-column scrollable list, used by LearnMove.
 *  - **grid mode**: 2×2 move slots, used by PlayerAttack. The selected move's
 *    type/category/PP/description is shown by MoveInfoOverlay — this menu just
 *    emits `attackmenu-selection-changed` with the new index on every change.
 *
 * In grid mode, B/CANCEL emits `attackmenu-cancel` via the `back()` hook — the
 * state listens for it instead of the list-mode "Cancel" item.
 *
 * @extends Menu
 */
export default class AttackMenu extends Menu {
  constructor(scene, x, y) {
    super(scene, x, y, {
      columns: 1,
      cellWidth:  PANEL_W - LIST_PAD_X * 2,
      cellHeight: LIST_CELL_H,
      padX:       LIST_PAD_X,
      padY:       LIST_PAD_Y,
    });
    this.name = 'AttackMenu';

    this._gridMode = false;
    this._bg       = null;

    this._drawPanel();
  }

  _drawPanel() {
    if (this._bg) { this._bg.destroy(); this._bg = null; }

    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0x1a1a3a);
    bg.fillRect(0, 0, PANEL_W, PANEL_H);
    bg.lineStyle(4, 0x181818);
    bg.strokeRect(0, 0, PANEL_W, PANEL_H);

    if (this._gridMode) {
      bg.lineStyle(1, 0x2a2a5a);
      bg.lineBetween(PANEL_W / 2, 8, PANEL_W / 2, PANEL_H - 8);
      bg.lineBetween(8, PANEL_H / 2, PANEL_W - 8, PANEL_H / 2);
    }

    this.addAt(bg, 0);
    this._bg = bg;
  }

  // ─── Mode switches ─────────────────────────────────────────────────────────

  useListMode() {
    this._gridMode = false;
    this.config.columns    = 1;
    this.config.cellWidth  = PANEL_W - LIST_PAD_X * 2;
    this.config.cellHeight = LIST_CELL_H;
    this.config.padX       = LIST_PAD_X;
    this.config.padY       = LIST_PAD_Y;
    this.clear();
    this._drawPanel();
  }

  useGridMode() {
    this._gridMode = true;
    this.config.columns    = 2;
    this.config.cellWidth  = GRID_CELL_W;
    this.config.cellHeight = GRID_CELL_H;
    this.config.padX       = GRID_PAD_X;
    this.config.padY       = GRID_PAD_Y;
    this.clear();
    this._drawPanel();
  }

  // ─── Base overrides ────────────────────────────────────────────────────────

  _emitSelectionChanged() {
    if (!this._gridMode) return;
    this.scene.events.emit('attackmenu-selection-changed', this.config.menuItemIndex);
  }

  select(index) {
    super.select(index);
    this._emitSelectionChanged();
  }

  moveSelectionUp()    { super.moveSelectionUp();    this._emitSelectionChanged(); }
  moveSelectionDown()  { super.moveSelectionDown();  this._emitSelectionChanged(); }
  moveSelectionLeft()  { super.moveSelectionLeft();  this._emitSelectionChanged(); }
  moveSelectionRight() { super.moveSelectionRight(); this._emitSelectionChanged(); }

  /**
   * In grid mode, B/CANCEL emits attackmenu-cancel so the state can route
   * back to PLAYER_ACTION without needing a visible "Cancel" slot.
   * Returning true tells Scene2's CANCEL handler we've handled it.
   */
  back() {
    if (!this._gridMode) return false;
    this.scene.events.emit(`${this.name.toLowerCase()}-cancel`);
    return true;
  }
}
