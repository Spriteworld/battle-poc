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

    // Background
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0xf0ece4);
    bg.fillRect(0, 0, w, h);
    this.add(bg);

    // Outer border
    const outer = new Phaser.GameObjects.Graphics(this.scene);
    outer.lineStyle(4, 0x181818);
    outer.strokeRect(0, 0, w, h);
    this.add(outer);

    // Inner border (inset by 5px)
    const inner = new Phaser.GameObjects.Graphics(this.scene);
    inner.lineStyle(2, 0x787878);
    inner.strokeRect(5, 5, w - 10, h - 10);
    this.add(inner);

    // Text lines
    const LINE_H = 22;
    const TOP_PAD = 20;
    this._lines = [];
    for (let i = 0; i < this._maxVisible; i++) {
      const t = this.scene.add.text(18, TOP_PAD + i * LINE_H, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
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
