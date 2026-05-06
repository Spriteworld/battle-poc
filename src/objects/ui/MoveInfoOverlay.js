import Phaser from 'phaser';
import TypeCategoryPill, { TYPE_CAT_PILL_W, TYPE_CAT_PILL_H } from '../common/TypeCategoryPill.js';

const PAD = 18;

/**
 * Panel rendered over the battle textbox while the move picker is open.
 * Displays the currently-hovered move's combined type/category pill, PP
 * count, name, and wrapped description text.
 *
 * Pre-created by Scene2 and hidden until a state (PlayerAttack) shows it.
 *
 * @extends Phaser.GameObjects.Container
 */
export default class MoveInfoOverlay extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height) {
    super(scene, x, y);
    this._w = width;
    this._h = height;
    this._pill = null;
    this._build();
    scene.add.existing(this);
  }

  _build() {
    // Fully opaque fill — the logger underneath must not bleed through.
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x101020, 1);
    bg.fillRect(0, 0, this._w, this._h);
    bg.lineStyle(4, 0x181818);
    bg.strokeRect(0, 0, this._w, this._h);
    this.add(bg);

    this._nameText = this.scene.add.text(PAD, PAD - 4, '', {
      fontFamily: 'Gen3', fontSize: '22px', color: '#f8f8f8',
    });
    this.add(this._nameText);

    // Slot the pill renders into (recreated each setMove to swap type/cat).
    this._pillSlot = this.scene.add.container(PAD, PAD + 28);
    this.add(this._pillSlot);

    // PP text — right-aligned, vertically centred on the pill row.
    this._ppText = this.scene.add.text(
      this._w - PAD, PAD + 28 + TYPE_CAT_PILL_H / 2, '',
      { fontFamily: 'Gen3', fontSize: '14px', color: '#f8f8f8' }
    ).setOrigin(1, 0.5);
    this.add(this._ppText);

    // Description — wraps within the panel's inner width, up to 4 lines.
    this._descText = this.scene.add.text(PAD, PAD + 28 + TYPE_CAT_PILL_H + 14, '', {
      fontFamily: 'Gen3', fontSize: '14px', color: '#e0e0e8',
      wordWrap: { width: this._w - PAD * 2 },
      maxLines: 4,
    });
    this.add(this._descText);
  }

  /**
   * Updates the overlay with the given move data.
   *
   * @param {object} move
   * @param {string} move.name
   * @param {string} move.type        - TypePill key (e.g. 'fire')
   * @param {string} move.category    - 'physical' | 'special' | 'status'
   * @param {number} move.ppCurrent
   * @param {number} move.ppMax
   * @param {string} move.description - Flavour text
   */
  setMove({ name, type, category, ppCurrent, ppMax, description } = {}) {
    this._nameText.setText(name ?? '');

    // Swap the pill — destroy the previous one and build a fresh pill at
    // the same slot coordinates so the type/category always match the move.
    if (this._pill) { this._pill.destroy(); this._pill = null; }
    if (type || category) {
      this._pill = new TypeCategoryPill(this.scene, 0, 0, type, category);
      this._pillSlot.add(this._pill);
    }

    this._ppText.setText(`PP ${ppCurrent ?? '—'}/${ppMax ?? '—'}`);
    this._descText.setText(description || '');
  }

  clear() {
    this._nameText.setText('');
    if (this._pill) { this._pill.destroy(); this._pill = null; }
    this._ppText.setText('');
    this._descText.setText('');
  }
}
