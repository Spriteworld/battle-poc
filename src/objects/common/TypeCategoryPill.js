import Phaser from 'phaser';
import {
  makeTypeIcon, makeCategoryIcon,
  TYPE_ICON_W, TYPE_ICON_H,
  CATEGORY_ICON_W, CATEGORY_ICON_H,
} from './iconSheets.js';

/**
 * Combined type/move-category pill — a single rounded rect split diagonally
 * into two trapezoids. The left trapezoid (lighter grey) holds the type icon;
 * the right trapezoid (darker grey) holds the move-category icon.
 *
 * Same visual as the character project's TypeCategoryPill, packaged here as
 * a Phaser Container so it can be added as a child of other containers
 * (e.g. MoveInfoOverlay).
 *
 * @extends Phaser.GameObjects.Container
 */
export const TYPE_CAT_PILL_W = 56;
export const TYPE_CAT_PILL_H = 26;

const _RADIUS = 5;

export default class TypeCategoryPill extends Phaser.GameObjects.Container {
  static WIDTH  = TYPE_CAT_PILL_W;
  static HEIGHT = TYPE_CAT_PILL_H;

  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} [type]      - Case-insensitive type key (e.g. 'fire').
   * @param {string} [category]  - 'physical' | 'special' | 'status'.
   */
  constructor(scene, x, y, type, category) {
    super(scene, x, y);

    const W = TYPE_CAT_PILL_W;
    const H = TYPE_CAT_PILL_H;

    // Diagonal endpoints — 75% across top, 25% across bottom.
    const dTopX = W * 0.75;
    const dTopY = 0;
    const dBotX = W * 0.25;
    const dBotY = H;

    const leftPoly = [
      { x: 0,     y: 0 },
      { x: dTopX, y: dTopY },
      { x: dBotX, y: dBotY },
      { x: 0,     y: H },
    ];

    // Body (darker grey — category side fills the full pill).
    const body = scene.add.graphics();
    body.fillStyle(0x2a2a2a, 1);
    body.fillRoundedRect(0, 0, W, H, _RADIUS);
    this.add(body);

    // Lighter grey overlay on the left trapezoid.  Icons are sized so they
    // stay within each half without needing a clipping mask.
    const light = scene.add.graphics();
    light.fillStyle(0x454545, 1);
    light.fillPoints(leftPoly, true);
    this.add(light);

    // Type icon on the left trapezoid.
    if (type) {
      const tX = Math.round(W * 0.27 - TYPE_ICON_W / 2);
      const tY = Math.round(H * 0.42 - TYPE_ICON_H / 2);
      const icon = makeTypeIcon(scene, tX, tY, type);
      if (icon) this.add(icon);
    }

    // Category icon on the right trapezoid.
    if (category) {
      const cX = Math.round(W * 0.73 - CATEGORY_ICON_W / 2);
      const cY = Math.round(H * 0.58 - CATEGORY_ICON_H / 2);
      const icon = makeCategoryIcon(scene, cX, cY, category);
      if (icon) this.add(icon);
    }

    // Diagonal divider line.
    const line = scene.add.graphics();
    line.lineStyle(1, 0x181818, 1);
    line.lineBetween(dTopX, dTopY, dBotX, dBotY);
    this.add(line);

    scene.add.existing(this);
  }
}
