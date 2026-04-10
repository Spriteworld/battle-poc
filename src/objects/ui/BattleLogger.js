import Phaser from 'phaser';
import DialogBox from './DialogBox.js';

const PAD        = 18;
const FONT       = { fontFamily: 'Gen3', fontSize: '18px', color: '#181818' };
const R          = 8;
const DEPTH      = 5;
const CHAR_DELAY = { normal: 30, fast: 10, instant: 0 };

/**
 * Replaces the raw DialogBox as the battle logger.
 *
 * During a turn the engine calls `addItem()` to queue messages, then
 * `flush(callback)` to display them one-at-a-time in the textbox area.
 * The player presses Z (routed via `advance()`) to step through each
 * message; the callback fires once the queue is empty.
 *
 * The full message history is accessible at any time via `toggle()`
 * (mapped to the L key), which slides a DialogBox overlay over the scene.
 */
export default class BattleLogger {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x       left edge of the dialog area
   * @param {number} y       top edge of the dialog area
   * @param {number} width   width of the dialog area
   * @param {number} height  height of the dialog area
   */
  constructor(scene, x, y, width, height, { textSpeed = 'normal' } = {}) {
    this._scene     = scene;
    this._x         = x;
    this._y         = y;
    this._w         = width;
    this._h         = height;
    this._charDelay = CHAR_DELAY[textSpeed] ?? CHAR_DELAY.normal;

    // ── Queue & history ────────────────────────────────────────────────────
    this._queue    = [];   // messages awaiting display
    this._history  = [];   // all messages ever (max 200)
    this._callback = null; // called when queue is drained
    this._flushing = false;

    // ── Typing animation ───────────────────────────────────────────────────
    this._typing     = false;
    this._fullText   = '';
    this._charIdx    = 0;
    this._typingTimer = null;

    // ── Textbox display ────────────────────────────────────────────────────
    this._bg = scene.add.graphics().setDepth(DEPTH);
    this._drawBg();

    this._textObj = scene.add.text(x + PAD, y + PAD, '', {
      ...FONT,
      wordWrap: { width: width - PAD * 2 },
      maxLines: 3,
    }).setDepth(DEPTH + 1);

    // ▼ shown while more messages remain; ■ on the last one (tap to continue)
    this._indicator = scene.add.text(
      x + width - PAD,
      y + height - PAD,
      '▼',
      { fontFamily: 'Gen3', fontSize: '14px', color: '#606060' }
    ).setOrigin(1, 1).setDepth(DEPTH + 1).setVisible(false);

    // ── Click / tap to advance ────────────────────────────────────────────
    this._hitZone = scene.add.zone(x, y, width, height)
      .setOrigin(0, 0)
      .setDepth(DEPTH + 2)
      .setInteractive({ useHandCursor: true });
    this._hitZone.on('pointerdown', () => { this.advance(); });

    // ── History overlay (L key) ────────────────────────────────────────────
    this._overlay         = new DialogBox(scene, x, 0, width, scene.scale.height, 20);
    this._overlay.setDepth(50);
    this._overlay.setVisible(false);
    this._overlayVisible  = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Queues a message for sequential display and appends it to history.
   * @param {string} text
   */
  addItem(text) {
    const s = String(text);
    this._queue.push(s);
    this._history.push(s);
    if (this._history.length > 200) this._history.shift();

    // Keep the overlay in sync if it's open
    if (this._overlayVisible) {
      this._overlay.addItem(s);
    }
  }

  /**
   * Drains the current queue, showing each message one-at-a-time.
   * `callback` is invoked after the last message is acknowledged.
   * If the queue is empty, `callback` fires immediately.
   *
   * @param {function} callback
   */
  flush(callback) {
    if (this._queue.length === 0) {
      callback?.();
      return;
    }
    // Chain: if already flushing, run the new flush after the current one.
    if (this._flushing) {
      const prev = this._callback;
      this._callback = () => { prev?.(); this.flush(callback); };
      return;
    }
    this._callback = callback;
    this._flushing = true;
    this._showNext();
  }

  /** Advance to the next queued message.  Called when Z is pressed. */
  advance() {
    if (!this._flushing) return;
    if (this._typing) {
      this._skipTyping();
    } else {
      this._showNext();
    }
  }

  /** @returns {boolean} true while messages are being shown */
  isFlushing() {
    return this._flushing;
  }

  /**
   * Directly sets the dialog text without queuing or requiring acknowledgment.
   * Used for contextual prompts (e.g. "What will X do?") that should display
   * alongside an interactive menu rather than as a flushed, acknowledged message.
   * Safe to call only when the logger is idle (not currently flushing).
   * @param {string} text
   */
  showText(text) {
    this._textObj.setText(String(text));
    this._indicator.setVisible(false);
  }

  /** Toggle the full-history overlay (L key). */
  toggle() {
    this._overlayVisible = !this._overlayVisible;
    if (this._overlayVisible) {
      // Rebuild the overlay with current history
      this._overlay.clear();
      this._history.forEach(m => this._overlay.addItem(m));
      this._overlay.setVisible(true);
    } else {
      this._overlay.setVisible(false);
    }
  }

  /** Scroll the history overlay up (older messages). */
  scrollUp() {
    if (this._overlayVisible) this._overlay.scrollUp();
  }

  /** Scroll the history overlay down (newer messages). */
  scrollDown() {
    if (this._overlayVisible) this._overlay.scrollDown();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _drawBg() {
    this._bg.clear();
    this._bg.fillStyle(0xffffff, 1);
    this._bg.fillRoundedRect(this._x, this._y, this._w, this._h, R);
    this._bg.lineStyle(3, 0x181818, 1);
    this._bg.strokeRoundedRect(this._x, this._y, this._w, this._h, R);
  }

  _showNext() {
    if (this._queue.length === 0) {
      // Queue drained — reset and fire callback
      this._flushing = false;
      this._indicator.setVisible(false);
      const cb = this._callback;
      this._callback = null;
      cb?.();
      return;
    }

    const msg = this._queue.shift();
    this._startTyping(msg);
  }

  _startTyping(msg) {
    this._fullText = msg;
    this._charIdx  = 1;
    this._typing   = true;
    this._indicator.setVisible(false);

    if (this._charDelay === 0) {
      this._skipTyping();
      return;
    }

    this._textObj.setText(msg.slice(0, 1));

    this._typingTimer = this._scene.time.addEvent({
      delay:    this._charDelay,
      repeat:   msg.length - 1,
      callback: () => {
        this._charIdx++;
        this._textObj.setText(this._fullText.slice(0, this._charIdx));
        if (this._charIdx >= this._fullText.length) {
          this._onTypingComplete();
        }
      },
    });
  }

  _skipTyping() {
    if (this._typingTimer) {
      this._typingTimer.remove(false);
      this._typingTimer = null;
    }
    this._textObj.setText(this._fullText);
    this._onTypingComplete();
  }

  _onTypingComplete() {
    this._typing = false;
    this._typingTimer = null;
    this._indicator
      .setText(this._queue.length > 0 ? '▼' : '■')
      .setVisible(true);
  }
}
