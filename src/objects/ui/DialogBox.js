import Phaser from 'phaser';

/**
 * Gen 3-style bordered dialog box for the bottom of the battle screen.
 *
 * Displays the last few battle messages with a Gen 3-inspired beige box and
 * double-border. Exposes the same addItem / clear interface as Log so existing
 * state code requires no changes.
 *
 * @extends Phaser.GameObjects.Container
 */
export default class DialogBox extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} [maxVisible=3] - How many lines to display at once
   */
  constructor(scene, x, y, width, height, maxVisible = 3) {
    super(scene, x, y);
    this._width = width;
    this._height = height;
    this._maxVisible = maxVisible;
    this._messages = [];
    scene.add.existing(this);
    this._build();
  }

  _build() {
    const w = this._width;
    const h = this._height;
    const R = 8; // corner radius

    // Background — white rounded rect
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0xffffff);
    bg.fillRoundedRect(0, 0, w, h, R);
    this.add(bg);

    // Single dark border
    const border = new Phaser.GameObjects.Graphics(this.scene);
    border.lineStyle(3, 0x181818);
    border.strokeRoundedRect(0, 0, w, h, R);
    this.add(border);

    // Text lines
    const LINE_H = 22;
    const TOP_PAD = 20;
    this._lines = [];
    for (let i = 0; i < this._maxVisible; i++) {
      const t = this.scene.add.text(18, TOP_PAD + i * LINE_H, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#181818',
        wordWrap: { width: w - 36 },
      });
      this._lines.push(t);
      this.add(t);
    }
  }

  _redraw() {
    const recent = this._messages.slice(-this._maxVisible);
    this._lines.forEach((line, i) => line.setText(recent[i] ?? ''));
  }

  /**
   * Appends a message and redraws the visible lines.
   * @param {string} text
   */
  addItem(text) {
    this._messages.push(String(text));
    if (this._messages.length > 200) this._messages.shift();
    this._redraw();
  }

  /** Clears all messages. */
  clear() {
    this._messages = [];
    this._lines.forEach(l => l.setText(''));
  }
}
