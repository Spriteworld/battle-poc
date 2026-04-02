import Phaser from 'phaser';
import { TEXT_STYLE, TEXT_STYLE_BOLD } from '../common/constants.js';

const PAD      = 16;
const BTN_H    = 28;
const BTN_GAP  = 8;
const R        = 8;
const W        = 260;

/**
 * A modal yes / no prompt with configurable callbacks.
 *
 * The dialog blocks input to everything else while visible.  Pressing Enter /
 * Z confirms the highlighted choice; Escape / X always fires `onCancel`.
 * Arrow keys (up/down) move the cursor between buttons.
 *
 * Usage:
 *   const dlg = new ConfirmDialog(scene, x, y, {
 *     message:   'Use your last Revive?',
 *     onConfirm: () => { ... },
 *     onCancel:  () => { ... },
 *     confirmLabel: 'Yes',  // optional, default 'Yes'
 *     cancelLabel:  'No',   // optional, default 'No'
 *   });
 *   // Show / hide via setVisible(true/false).
 *   // The dialog removes its own keyboard listener when dismissed.
 *
 * @extends Phaser.GameObjects.Container
 */
export default class ConfirmDialog extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} opts
   * @param {string}   opts.message
   * @param {Function} opts.onConfirm
   * @param {Function} opts.onCancel
   * @param {string}  [opts.confirmLabel='Yes']
   * @param {string}  [opts.cancelLabel='No']
   */
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);

    this._message      = opts.message      ?? '';
    this._onConfirm    = opts.onConfirm    ?? (() => {});
    this._onCancel     = opts.onCancel     ?? (() => {});
    this._confirmLabel = opts.confirmLabel ?? 'Yes';
    this._cancelLabel  = opts.cancelLabel  ?? 'No';

    // 0 = confirm button highlighted, 1 = cancel button highlighted
    this._cursor = 0;

    this._btnTexts    = [];
    this._keyListener = this._onKey.bind(this);

    scene.add.existing(this);
    this._build();

    // Hidden until the caller shows it.
    this.setVisible(false);
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  _build() {
    // Measure wrapped message height.
    const innerW    = W - PAD * 2;
    const msgSample = this.scene.add.text(0, 0, this._message, {
      ...TEXT_STYLE,
      wordWrap: { width: innerW },
    });
    const msgH = msgSample.height;
    msgSample.destroy();

    const totalH = PAD + msgH + PAD + BTN_H * 2 + BTN_GAP + PAD;

    // Background — dark navy panel, consistent with BattleMenu style.
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0x101878);
    bg.fillRoundedRect(0, 0, W, totalH, R);
    this.add(bg);

    // Border
    const border = new Phaser.GameObjects.Graphics(this.scene);
    border.lineStyle(3, 0x181818);
    border.strokeRoundedRect(0, 0, W, totalH, R);
    this.add(border);

    // Message text
    const msg = this.scene.add.text(PAD, PAD, this._message, {
      ...TEXT_STYLE,
      color: '#f0ece4',
      wordWrap: { width: innerW },
    });
    this.add(msg);

    // Divider
    const div = new Phaser.GameObjects.Graphics(this.scene);
    div.lineStyle(1, 0x2030a0);
    div.lineBetween(PAD, PAD + msgH + PAD - 4, W - PAD, PAD + msgH + PAD - 4);
    this.add(div);

    // Buttons (confirm first, cancel second)
    const btnY0 = PAD + msgH + PAD;
    const labels = [this._confirmLabel, this._cancelLabel];
    labels.forEach((label, i) => {
      const btnBg = new Phaser.GameObjects.Graphics(this.scene);
      btnBg.fillStyle(0x1a1a3a);
      btnBg.fillRoundedRect(PAD, btnY0 + i * (BTN_H + BTN_GAP), W - PAD * 2, BTN_H, 4);
      this.add(btnBg);

      const t = this.scene.add.text(
        PAD + 8,
        btnY0 + i * (BTN_H + BTN_GAP) + (BTN_H - 16) / 2,
        ' ' + label,
        { ...TEXT_STYLE_BOLD, color: '#f0ece4' }
      );
      this._btnTexts.push(t);
      this.add(t);
    });

    this._totalH = totalH;
    this._btnY0  = btnY0;
    this._updateCursor();
  }

  // ── Cursor ───────────────────────────────────────────────────────────────────

  _updateCursor() {
    this._btnTexts.forEach((t, i) => {
      const label = i === 0 ? this._confirmLabel : this._cancelLabel;
      if (i === this._cursor) {
        t.setColor('#f8e030');
        t.setText('►' + label);
      } else {
        t.setColor('#f0ece4');
        t.setText(' ' + label);
      }
    });
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  _onKey(event) {
    if (!this.visible) return;

    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      this._cursor = this._cursor === 0 ? 1 : 0;
      this._updateCursor();
      return;
    }

    if (event.code === 'Enter' || event.code === 'KeyZ') {
      if (this._cursor === 0) {
        this._dismiss();
        this._onConfirm();
      } else {
        this._dismiss();
        this._onCancel();
      }
      return;
    }

    if (event.code === 'Escape' || event.code === 'KeyX') {
      this._dismiss();
      this._onCancel();
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  _dismiss() {
    this.setVisible(false);
    this.scene.input.keyboard.off('keydown', this._keyListener);
  }

  /**
   * Shows the dialog and begins listening for keyboard input.
   * Resets the cursor to the confirm button each time.
   */
  show() {
    this._cursor = 0;
    this._updateCursor();
    this.setVisible(true);
    // Use once-registered persistent listener so repeated show() calls don't
    // stack duplicate listeners.
    this.scene.input.keyboard.off('keydown', this._keyListener);
    this.scene.input.keyboard.on('keydown', this._keyListener);
  }

  /** Hides the dialog without firing any callback. */
  hide() {
    this._dismiss();
  }
}
