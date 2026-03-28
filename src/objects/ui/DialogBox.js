import Phaser from 'phaser';

const LINE_H   = 22;
const TOP_PAD  = 20;
const BOT_PAD  = 24;   // room for ▼ arrow
const R        = 8;
const TWEEN_MS = 200;

/**
 * Gen 3-style bordered dialog box for the bottom of the battle screen.
 *
 * Shows the last `maxVisible` messages.  New messages auto-scroll to the
 * bottom.  Call `scrollUp()` / `scrollDown()` to browse history.
 *
 * Hovering smoothly expands the height to fill the canvas; moving out
 * collapses it.  Interrupted animations reverse from their current position.
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
   * @param {number} [maxVisible=3]
   */
  constructor(scene, x, y, width, height, maxVisible = 3) {
    super(scene, x, y);
    this._width      = width;
    this._maxVisible = maxVisible;
    this._messages   = [];
    this._scrollOffset = 0;

    // Settled geometry (what we target on collapse)
    this._origY          = y;
    this._origHeight     = height;
    this._origMaxVisible = maxVisible;

    // Tracks the currently-rendered height (updated every tween frame).
    // Separate from _origHeight so interrupted tweens start from the right place.
    this._visualH = height;

    this._expanded    = false;
    this._heightTween = null;

    scene.add.existing(this);
    this._build();
  }

  // ── Build / rebuild ────────────────────────────────────────────────────────

  _build() {
    const w = this._width;
    const h = this._visualH;

    this._bg = new Phaser.GameObjects.Graphics(this.scene);
    this._bg.fillStyle(0xffffff);
    this._bg.fillRoundedRect(0, 0, w, h, R);
    this.add(this._bg);

    this._border = new Phaser.GameObjects.Graphics(this.scene);
    this._border.lineStyle(3, 0x181818);
    this._border.strokeRoundedRect(0, 0, w, h, R);
    this.add(this._border);

    this._lines = [];
    for (let i = 0; i < this._maxVisible; i++) {
      const t = this.scene.add.text(18, TOP_PAD + i * LINE_H, '', {
        fontFamily: 'Gen3',
        fontSize: '14px',
        color: '#181818',
        wordWrap: { width: w - 36 },
      });
      this._lines.push(t);
      this.add(t);
    }

    this._arrowUp = this.scene.add.text(w - 12, 6, '▲', {
      fontFamily: 'Gen3', fontSize: '13px', color: '#606060',
    });
    this._arrowUp.setOrigin(1, 0).setVisible(false);
    this.add(this._arrowUp);

    this._arrowDown = this.scene.add.text(w - 12, h - 18, '▼', {
      fontFamily: 'Gen3', fontSize: '13px', color: '#606060',
    });
    this._arrowDown.setOrigin(1, 0).setVisible(false);
    this.add(this._arrowDown);
  }

  /** Full tear-down and rebuild at current `_visualH` / `_maxVisible`. */
  _rebuild() {
    this.removeAll(true);
    this._lines = [];
    this._arrowUp = this._arrowDown = this._bg = this._border = null;
    this._build();
    this._setHitArea();
    this._redraw();
  }

  /**
   * (Re-)registers the interactive hit area to match `_visualH`.
   * Called after _build() and each tween frame so pointer events stay accurate.
   */
  _setHitArea() {
    const rect = new Phaser.Geom.Rectangle(0, 0, this._width, this._visualH);
    this.setInteractive(rect, Phaser.Geom.Rectangle.Contains);
  }

  // ── Per-frame visual update ────────────────────────────────────────────────

  /**
   * Redraws background/border, repositions ▼ arrow, and updates the hit area
   * to match the new animated height.  Called every tween frame.
   * @param {number} h
   */
  _applyVisualH(h) {
    this._visualH = h;

    this._bg.clear();
    this._bg.fillStyle(0xffffff);
    this._bg.fillRoundedRect(0, 0, this._width, h, R);

    this._border.clear();
    this._border.lineStyle(3, 0x181818);
    this._border.strokeRoundedRect(0, 0, this._width, h, R);

    this._arrowDown.setY(h - 18);

    // Update hit area in-place so pointer-over/out tracks the visual bounds.
    if (this.input?.hitArea?.setTo) {
      this.input.hitArea.setTo(0, 0, this._width, h);
    }
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  _stopTween() {
    if (this._heightTween) {
      this._heightTween.remove();
      this._heightTween = null;
    }
  }

  /**
   * Tweens y and height from their current visual values to the targets.
   * Always starts from the actual rendered state, so interrupted tweens
   * reverse smoothly from mid-animation.
   */
  _animateTo(toY, toH, onDone) {
    this._stopTween();
    const proxy = { y: this.y, h: this._visualH };
    this._heightTween = this.scene.tweens.add({
      targets:  proxy,
      y:        toY,
      h:        toH,
      duration: TWEEN_MS,
      ease:     'Quad.easeOut',
      onUpdate: () => {
        this.setY(proxy.y);
        this._applyVisualH(proxy.h);
      },
      onComplete: () => {
        this._heightTween = null;
        onDone();
      },
    });
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────

  /** Toggles between expanded (full-screen) and collapsed (normal) states. */
  toggle() {
    if (this._expanded) {
      this._collapse();
    } else {
      this._expand();
    }
  }

  _expand() {
    if (this._expanded) return;
    this._expanded = true;
    this.setDepth(100);

    const targetH = this.scene.scale.height;

    this._animateTo(0, targetH, () => {
      this._maxVisible = Math.floor((targetH - TOP_PAD - BOT_PAD) / LINE_H);
      this._visualH    = targetH;
      this._rebuild();
    });
  }

  _collapse() {
    if (!this._expanded) return;
    this._expanded = false;

    // Snap text to collapsed line count immediately so lines don't spill
    // outside the shrinking box during the animation.
    this._maxVisible = this._origMaxVisible;
    this._redraw();

    this._animateTo(this._origY, this._origHeight, () => {
      this._visualH = this._origHeight;
      this.setDepth(0);
      this._rebuild();
    });
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _redraw() {
    const total = this._messages.length;
    const end   = Math.max(0, total - this._scrollOffset);
    const start = Math.max(0, end - this._maxVisible);
    const slice = this._messages.slice(start, end);
    this._lines.forEach((line, i) => {
      if (i < this._maxVisible) {
        line.setText(slice[i] ?? '');
        line.setVisible(true);
      } else {
        line.setVisible(false);
      }
    });
    this._arrowUp.setVisible(end < total);
    this._arrowDown.setVisible(this._scrollOffset > 0);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Appends a message and redraws, auto-scrolling to the bottom.
   * @param {string} text
   */
  addItem(text) {
    this._messages.push(String(text));
    if (this._messages.length > 200) this._messages.shift();
    this._scrollOffset = 0;
    this._redraw();
  }

  /** Scroll up into history (shows older messages). */
  scrollUp() {
    if (this._scrollOffset + this._maxVisible < this._messages.length) {
      this._scrollOffset++;
      this._redraw();
    }
  }

  /** Scroll down toward the latest messages. */
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
