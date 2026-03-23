import Phaser from 'phaser';

/**
 * Gen 3-style bordered dialog box for the bottom of the battle screen.
 *
 * Shows the last `maxVisible` messages.  New messages auto-scroll to the
 * bottom.  Call `scrollUp()` / `scrollDown()` to browse history — a ▲
 * indicator appears when there is history above the current view.
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
    this._scrollOffset = 0; // 0 = latest messages; positive = scrolled into history
    scene.add.existing(this);
    this._build();
  }

  _build() {
    const w = this._width;
    const h = this._height;
    const R = 8;

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

    // ▲ indicator — shown when there is history above the current view
    this._arrowUp = this.scene.add.text(w - 12, 6, '▲', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#606060',
    });
    this._arrowUp.setOrigin(1, 0);
    this._arrowUp.setVisible(false);
    this.add(this._arrowUp);

    // ▼ indicator — shown when scrolled up and there are newer messages below
    this._arrowDown = this.scene.add.text(w - 12, h - 18, '▼', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#606060',
    });
    this._arrowDown.setOrigin(1, 0);
    this._arrowDown.setVisible(false);
    this.add(this._arrowDown);
  }

  _redraw() {
    const total = this._messages.length;
    // _scrollOffset 0 = bottom (latest); positive = scrolled up into history
    const end   = Math.max(0, total - this._scrollOffset);
    const start = Math.max(0, end - this._maxVisible);
    const slice = this._messages.slice(start, end);
    this._lines.forEach((line, i) => line.setText(slice[i] ?? ''));
    this._arrowUp.setVisible(end < total);           // history above current view
    this._arrowDown.setVisible(this._scrollOffset > 0); // newer messages below
  }

  /**
   * Appends a message and redraws, auto-scrolling to the bottom.
   * @param {string} text
   */
  addItem(text) {
    this._messages.push(String(text));
    if (this._messages.length > 200) this._messages.shift();
    this._scrollOffset = 0; // always snap to latest on new message
    this._redraw();
  }

  /**
   * Scroll up into history (shows older messages).
   * No-op when already at the top of history.
   */
  scrollUp() {
    if (this._scrollOffset + this._maxVisible < this._messages.length) {
      this._scrollOffset++;
      this._redraw();
    }
  }

  /**
   * Scroll down toward the latest messages.
   * No-op when already at the bottom.
   */
  scrollDown() {
    if (this._scrollOffset > 0) {
      this._scrollOffset--;
      this._redraw();
    }
  }

  /** Clears all messages and resets scroll. */
  clear() {
    this._messages = [];
    this._scrollOffset = 0;
    this._lines.forEach(l => l.setText(''));
    this._arrowUp.setVisible(false);
    this._arrowDown.setVisible(false);
  }
}
