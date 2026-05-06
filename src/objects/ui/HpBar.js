import Phaser from 'phaser';

/**
 * Gen 3-style HP bar rendered with Phaser graphics.
 * Colors shift green → yellow → red as HP drops.
 * A thin dark outline surrounds the track for the Emerald-style look.
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
    this._width     = config.width     ?? 120;
    this._barHeight = config.barHeight ?? 6;
    this._currentHp = config.currentHp ?? 0;
    this._maxHp     = config.maxHp     ?? 100;

    this._displayRatio = this._maxHp > 0
      ? Math.max(0, Math.min(1, this._currentHp / this._maxHp))
      : 0;

    this._activeTween = null;
    this._seeded      = false;

    this._gfx = new Phaser.GameObjects.Graphics(this.scene);
    this.add(this._gfx);
    this._drawRatio(this._displayRatio);

    scene.add.existing(this);
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

  _drawRatio(ratio) {
    const g = this._gfx;
    g.clear();

    const W = this._width;
    const H = this._barHeight;

    // Dark outline around the entire bar
    g.fillStyle(0x303038);
    g.fillRect(-1, -1, W + 2, H + 2);

    // Grey track
    g.fillStyle(0xa8a8a8);
    g.fillRect(0, 0, W, H);

    // Colored fill
    const fillW = Math.max(0, Math.floor(W * ratio));
    if (fillW > 0) {
      g.fillStyle(this._hpColor(ratio));
      g.fillRect(0, 0, fillW, H);
    }
  }

  /**
   * Animates the bar from its current displayed ratio to match the new HP values.
   * @param {number} currentHp
   * @param {number} maxHp
   * @param {Function} [onComplete] - Called when the animation finishes (or immediately if no change).
   */
  update(currentHp, maxHp, onComplete) {
    this._currentHp = currentHp;
    this._maxHp     = maxHp;

    const targetRatio = maxHp > 0
      ? Math.max(0, Math.min(1, currentHp / maxHp))
      : 0;

    if (this._activeTween) {
      this._activeTween.stop();
      this._activeTween = null;
    }

    // First update seeds the display state instantly (no battle-start animation).
    if (!this._seeded) {
      this._seeded       = true;
      this._displayRatio = targetRatio;
      this._drawRatio(targetRatio);
      onComplete?.();
      return;
    }

    if (Math.abs(this._displayRatio - targetRatio) < 0.001) {
      this._displayRatio = targetRatio;
      this._drawRatio(targetRatio);
      onComplete?.();
      return;
    }

    // Duration scales with the delta so small changes feel snappy and big drops
    // feel weighty — minimum 150 ms, maximum 800 ms.
    const duration = Math.min(800, Math.max(150, Math.abs(targetRatio - this._displayRatio) * 1200));

    const proxy = { ratio: this._displayRatio };
    this._activeTween = this.scene.tweens.add({
      targets:  proxy,
      ratio:    targetRatio,
      duration,
      ease:     'Linear',
      onUpdate: () => {
        this._displayRatio = proxy.ratio;
        this._drawRatio(proxy.ratio);
      },
      onComplete: () => {
        this._displayRatio = targetRatio;
        this._drawRatio(targetRatio);
        this._activeTween = null;
        onComplete?.();
      },
    });
  }
}
