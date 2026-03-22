import Phaser from 'phaser';

/**
 * Gen 3-style HP bar rendered with Phaser graphics.
 * Colors shift green → yellow → red as HP drops.
 * @extends Phaser.GameObjects.Container
 */
export default class HpBar extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [config]
   * @param {number} [config.width=120]
   * @param {number} [config.currentHp=0]
   * @param {number} [config.maxHp=100]
   */
  constructor(scene, x, y, config = {}) {
    super(scene, x, y);
    this._width = config.width ?? 120;
    this._currentHp = config.currentHp ?? 0;
    this._maxHp = config.maxHp ?? 100;
    scene.add.existing(this);
    this._draw();
  }

  /**
   * @param {number} ratio - HP ratio 0–1
   * @return {number} Phaser colour integer
   */
  _hpColor(ratio) {
    if (ratio > 0.5) return 0x40c840;
    if (ratio > 0.2) return 0xf8c030;
    return 0xf03030;
  }

  _draw() {
    this.removeAll(true);

    const W = this._width;
    const H = 7;
    const ratio = this._maxHp > 0
      ? Math.max(0, Math.min(1, this._currentHp / this._maxHp))
      : 0;

    // Track (grey background)
    const track = new Phaser.GameObjects.Graphics(this.scene);
    track.fillStyle(0x707070);
    track.fillRect(0, 0, W, H);
    this.add(track);

    // Colored fill
    const fillW = Math.max(0, Math.floor(W * ratio));
    if (fillW > 0) {
      const fill = new Phaser.GameObjects.Graphics(this.scene);
      fill.fillStyle(this._hpColor(ratio));
      fill.fillRect(0, 0, fillW, H);
      this.add(fill);
    }
  }

  /**
   * Redraws the bar with new HP values.
   * @param {number} currentHp
   * @param {number} maxHp
   */
  update(currentHp, maxHp) {
    this._currentHp = currentHp;
    this._maxHp = maxHp;
    this._draw();
  }
}
