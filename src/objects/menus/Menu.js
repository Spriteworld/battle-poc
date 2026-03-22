import Phaser from 'phaser';
import { MenuItem } from '@Objects';

/**
 * Base container for all battle menus.
 *
 * Supports single-column (default) and multi-column grid layouts.
 * Single-column menus wrap at the top/bottom edge.
 * Multi-column (grid) menus clip at all edges with left/right navigation.
 *
 * @extends Phaser.GameObjects.Container
 */
export default class extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [config]
   * @param {number} [config.columns=1]     - Number of columns in the grid
   * @param {number} [config.cellWidth=160] - Width per grid cell in pixels
   * @param {number} [config.cellHeight=24] - Height per grid cell in pixels
   * @param {number} [config.padX=0]        - Left padding before first column
   * @param {number} [config.padY=0]        - Top padding before first row
   */
  constructor(scene, x, y, config = {}) {
    super(scene, x, y);

    this.config = {};
    this.config.scene = scene;
    this.config.menuItems = [];
    this.config.menuItemIndex = 0;
    this.config.x = x;
    this.config.y = y;
    this.config.selected = false;
    this.config.columns = config.columns ?? 1;
    this.config.cellWidth = config.cellWidth ?? 160;
    this.config.cellHeight = config.cellHeight ?? 24;
    this.config.padX = config.padX ?? 0;
    this.config.padY = config.padY ?? 0;

    if (!this.name) {
      this.name = (Math.random() + 1).toString(36).substring(7);
    }

    scene.add.existing(this);
    return this;
  }

  /** @return {string} */
  getName() {
    return this.name;
  }

  /**
   * Adds a text item, positioned by the current grid config.
   * @param {string} item
   * @return {this}
   */
  addMenuItem(item) {
    const idx = this.config.menuItems.length;
    const col = idx % this.config.columns;
    const row = Math.floor(idx / this.config.columns);
    const x = this.config.padX + col * this.config.cellWidth;
    const y = this.config.padY + row * this.config.cellHeight;

    const menuItem = new MenuItem(this.config.scene, x, y, item);
    this.config.menuItems.push(menuItem);
    this.add(menuItem);
    return this;
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  moveSelectionUp() {
    const cols = this.config.columns;
    const prev = this.config.menuItemIndex;
    if (cols === 1) {
      this.config.menuItems[prev]?.deselect();
      this.config.menuItemIndex = prev <= 0
        ? this.config.menuItems.length - 1
        : prev - 1;
    } else {
      if (prev < cols) return;
      this.config.menuItems[prev]?.deselect();
      this.config.menuItemIndex = prev - cols;
    }
    this.config.menuItems[this.config.menuItemIndex]?.select();
  }

  moveSelectionDown() {
    const cols = this.config.columns;
    const prev = this.config.menuItemIndex;
    const total = this.config.menuItems.length;
    if (cols === 1) {
      this.config.menuItems[prev]?.deselect();
      this.config.menuItemIndex = prev >= total - 1 ? 0 : prev + 1;
    } else {
      if (prev + cols >= total) return;
      this.config.menuItems[prev]?.deselect();
      this.config.menuItemIndex = prev + cols;
    }
    this.config.menuItems[this.config.menuItemIndex]?.select();
  }

  moveSelectionLeft() {
    const cols = this.config.columns;
    const prev = this.config.menuItemIndex;
    if (prev % cols === 0) return;
    this.config.menuItems[prev]?.deselect();
    this.config.menuItemIndex = prev - 1;
    this.config.menuItems[this.config.menuItemIndex]?.select();
  }

  moveSelectionRight() {
    const cols = this.config.columns;
    const prev = this.config.menuItemIndex;
    const total = this.config.menuItems.length;
    if (prev % cols === cols - 1) return;
    if (prev + 1 >= total) return;
    this.config.menuItems[prev]?.deselect();
    this.config.menuItemIndex = prev + 1;
    this.config.menuItems[this.config.menuItemIndex]?.select();
  }

  // ─── Selection state ───────────────────────────────────────────────────────

  /** @param {number} [index=0] */
  select(index = 0) {
    this.config.menuItems[this.config.menuItemIndex]?.deselect();
    this.config.menuItemIndex = index;
    this.config.menuItems[this.config.menuItemIndex]?.select();
    this.config.selected = true;
  }

  deselect() {
    this.config.menuItems[this.config.menuItemIndex]?.deselect();
    this.config.menuItemIndex = 0;
    this.config.selected = false;
  }

  /** Emits a scene event for the currently selected item index. */
  confirm() {
    const eventName = [this.name, 'select-option', this.config.menuItemIndex]
      .join('-')
      .toLowerCase();
    this.config.scene.events.emit(eventName, this.config.menuItemIndex);
  }

  // ─── Item management ───────────────────────────────────────────────────────

  clear() {
    for (let i = 0; i < this.config.menuItems.length; i++) {
      this.config.menuItems[i].destroy();
    }
    this.config.menuItems.length = 0;
    this.config.menuItemIndex = 0;
  }

  /**
   * Clears existing items and rebuilds from a string array.
   * @param {string[]} units
   */
  remap(units) {
    this.clear();
    for (let i = 0; i < units.length; i++) {
      this.addMenuItem(units[i]);
    }
    this.config.menuItemIndex = 0;
  }
}
