import Phaser from 'phaser';
import HpBar from './HpBar.js';

const FONT = { fontFamily: 'monospace', color: '#181818' };

/**
 * Gen 3-style status box displaying a Pokémon's name, level, and HP bar.
 *
 * Enemy variant: name + level + HP bar (no numbers).
 * Player variant: name + level + HP bar + current/max HP numbers.
 *
 * @extends Phaser.GameObjects.Container
 */
export default class PokemonStatusBox extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [config]
   * @param {boolean} [config.showHpNumbers=false] - Show numeric HP (player side)
   * @param {number}  [config.width=220]
   */
  constructor(scene, x, y, config = {}) {
    super(scene, x, y);
    this._showHpNumbers = config.showHpNumbers ?? false;
    this._width = config.width ?? 220;
    this._height = this._showHpNumbers ? 80 : 56;
    scene.add.existing(this);
    this._build();
  }

  _build() {
    const w = this._width;
    const h = this._height;

    // Background
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0xf0ece4, 0.92);
    bg.fillRoundedRect(0, 0, w, h, 5);
    this.add(bg);

    // Border
    const border = new Phaser.GameObjects.Graphics(this.scene);
    border.lineStyle(3, 0x181818);
    border.strokeRoundedRect(0, 0, w, h, 5);
    this.add(border);

    // Name (bold)
    this._nameText = this.scene.add.text(10, 8, '', {
      ...FONT,
      fontSize: '14px',
      fontStyle: 'bold',
    });
    this.add(this._nameText);

    // Level (right-aligned)
    this._levelText = this.scene.add.text(w - 8, 8, '', {
      ...FONT,
      fontSize: '12px',
    });
    this._levelText.setOrigin(1, 0);
    this.add(this._levelText);

    // "HP" label
    const hpLabel = this.scene.add.text(10, 31, 'HP', {
      ...FONT,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#505050',
    });
    this.add(hpLabel);

    // HP bar
    this._hpBar = new HpBar(this.scene, 30, 34, { width: w - 40 });
    this.add(this._hpBar);

    // Numeric HP (player side only)
    if (this._showHpNumbers) {
      this._hpNumText = this.scene.add.text(w - 8, 50, '', {
        ...FONT,
        fontSize: '12px',
      });
      this._hpNumText.setOrigin(1, 0);
      this.add(this._hpNumText);
    }
  }

  /**
   * Refreshes all displayed values.
   * @param {object} data
   * @param {string} data.name
   * @param {number} data.level
   * @param {number} data.currentHp
   * @param {number} data.maxHp
   */
  remap({ name, level, currentHp, maxHp }) {
    this._nameText.setText(name);
    this._levelText.setText(`Lv.${level}`);
    this._hpBar.update(currentHp, maxHp);
    if (this._hpNumText) {
      this._hpNumText.setText(`${currentHp}/${maxHp}`);
    }
  }
}
