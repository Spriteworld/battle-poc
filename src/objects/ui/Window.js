import Phaser from 'phaser';
import { TEXT_STYLE, TEXT_STYLE_BOLD } from '../common/constants.js';

const PAD  = 14;
const R    = 8;

/**
 * A reusable bordered panel that acts as a content host.
 *
 * Options:
 *   title   {string}  — optional header line rendered in bold above the body
 *   body    {string}  — optional body text (word-wrapped to fit the panel)
 *   width   {number}  — panel width in pixels
 *   height  {number}  — panel height in pixels (auto-computed when omitted)
 *   padX    {number}  — horizontal padding (default 14)
 *   padY    {number}  — vertical padding (default 14)
 *
 * After construction you can call `addContent(gameObject)` to append any
 * Phaser game object below the body text area.  The background and border are
 * always rendered at index 0 (behind all content).
 *
 * @extends Phaser.GameObjects.Container
 */
export default class Window extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [opts={}]
   * @param {string} [opts.title]
   * @param {string} [opts.body]
   * @param {number} [opts.width=280]
   * @param {number} [opts.height]   — auto-derived from content when omitted
   * @param {number} [opts.padX=14]
   * @param {number} [opts.padY=14]
   */
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);

    this._padX  = opts.padX  ?? PAD;
    this._padY  = opts.padY  ?? PAD;
    this._title = opts.title ?? null;
    this._body  = opts.body  ?? null;

    // Measure text height to auto-size the panel when no explicit height given.
    const innerW    = (opts.width ?? 280) - this._padX * 2;
    const titleH    = this._title ? 20 : 0;
    const titleGap  = this._title ? 8  : 0;
    const bodyLines = this._body
      ? Math.ceil(this._body.length * 8 / innerW) + 1
      : 0;
    const bodyH     = bodyLines * 20;
    const autoH     = this._padY * 2 + titleH + titleGap + bodyH;

    this._width  = opts.width  ?? 280;
    this._height = opts.height ?? Math.max(autoH, 48);

    // Track where the next addContent() call should position its object.
    this._contentY = this._padY;

    this._bg     = null;
    this._border = null;
    this._extra  = [];   // game objects added via addContent()

    scene.add.existing(this);
    this._build();
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  _build() {
    const w = this._width;
    const h = this._height;

    this._bg = new Phaser.GameObjects.Graphics(this.scene);
    this._bg.fillStyle(0xf8f8ec);
    this._bg.fillRoundedRect(0, 0, w, h, R);
    this.add(this._bg);

    this._border = new Phaser.GameObjects.Graphics(this.scene);
    this._border.lineStyle(3, 0x181818);
    this._border.strokeRoundedRect(0, 0, w, h, R);
    this.add(this._border);

    let cursorY = this._padY;
    const innerW = w - this._padX * 2;

    if (this._title) {
      const titleText = this.scene.add.text(this._padX, cursorY, this._title, {
        ...TEXT_STYLE_BOLD,
        wordWrap: { width: innerW },
      });
      this.add(titleText);
      cursorY += titleText.height + 8;

      // Divider line under title
      const div = new Phaser.GameObjects.Graphics(this.scene);
      div.lineStyle(1, 0x181818, 0.3);
      div.lineBetween(this._padX, cursorY - 4, w - this._padX, cursorY - 4);
      this.add(div);
    }

    if (this._body) {
      const bodyText = this.scene.add.text(this._padX, cursorY, this._body, {
        ...TEXT_STYLE,
        wordWrap: { width: innerW },
      });
      this.add(bodyText);
      cursorY += bodyText.height + 8;
    }

    this._contentY = cursorY;
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Appends a Phaser game object into the window's content area, positioned
   * below any title/body text.  Subsequent calls stack vertically.
   * @param {Phaser.GameObjects.GameObject} gameObject
   * @param {number} [gapAbove=0] — extra vertical gap above this object
   * @return {this}
   */
  addContent(gameObject, gapAbove = 0) {
    gameObject.setPosition(this._padX, this._contentY + gapAbove);
    this._contentY += gameObject.height + gapAbove + 4;
    this._extra.push(gameObject);
    this.add(gameObject);
    return this;
  }

  /** Resize the background/border without rebuilding text content. */
  resize(width, height) {
    this._width  = width;
    this._height = height;

    this._bg.clear();
    this._bg.fillStyle(0xf8f8ec);
    this._bg.fillRoundedRect(0, 0, width, height, R);

    this._border.clear();
    this._border.lineStyle(3, 0x181818);
    this._border.strokeRoundedRect(0, 0, width, height, R);
  }

  /** @return {number} */
  get panelWidth()  { return this._width; }
  /** @return {number} */
  get panelHeight() { return this._height; }
}
