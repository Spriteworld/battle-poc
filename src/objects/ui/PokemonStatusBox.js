import Phaser from 'phaser';
import HpBar from './HpBar.js';
import { GENDERS } from '@spriteworld/pokemon-data';

const FONT = { fontFamily: 'monospace', color: '#181818' };

const GENDER_SYMBOL = {
  [GENDERS.MALE]:   { label: '♂', color: '#6890f0' },
  [GENDERS.FEMALE]: { label: '♀', color: '#f85888' },
};

/** Maps the status value strings from BasePokemon to badge display config. */
const STATUS_BADGE = {
  'BURNED':    { label: 'BRN', bg: 0xf08030, text: '#ffffff' },
  'POISONED':  { label: 'PSN', bg: 0xa040a0, text: '#ffffff' },
  'PARALYZED': { label: 'PAR', bg: 0xf8d030, text: '#181818' },
  'SLEEP':     { label: 'SLP', bg: 0x909090, text: '#ffffff' },
  'FROZEN':    { label: 'FRZ', bg: 0x98d8d8, text: '#181818' },
  'TOXIC':     { label: 'TOX', bg: 0x5828a0, text: '#ffffff' },
};

const BADGE_W = 36;
const BADGE_H = 16;

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

    // Gender symbol (shown between name and level)
    this._genderText = this.scene.add.text(0, 8, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      fontStyle: 'bold',
    });
    this._genderText.setVisible(false);
    this.add(this._genderText);

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

    // Status badge (hidden until a condition is active)
    this._statusBadgeBg = new Phaser.GameObjects.Graphics(this.scene);
    this._statusBadgeBg.setVisible(false);
    this.add(this._statusBadgeBg);

    this._statusBadgeText = this.scene.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this._statusBadgeText.setOrigin(0.5, 0);
    this._statusBadgeText.setVisible(false);
    this.add(this._statusBadgeText);
  }

  /**
   * Refreshes all displayed values.
   * @param {object} data
   * @param {string} data.name
   * @param {number} data.level
   * @param {number} data.currentHp
   * @param {number} data.maxHp
   * @param {object} [data.status] - BattlePokemon status object (keys are STATUS values)
   * @param {string} [data.gender] - GENDERS constant value
   */
  remap({ name, level, currentHp, maxHp, status, gender }) {
    this._nameText.setText(name);
    this._levelText.setText(`Lv.${level}`);
    this._hpBar.update(currentHp, maxHp);
    if (this._hpNumText) {
      this._hpNumText.setText(`${currentHp}/${maxHp}`);
    }
    this._updateGenderSymbol(gender);
    this._updateStatusBadge(status);
  }

  /**
   * Shows or hides the gender symbol next to the pokemon name.
   * @param {string} [gender] - GENDERS constant value
   */
  _updateGenderSymbol(gender) {
    const cfg = GENDER_SYMBOL[gender];
    if (!cfg) {
      this._genderText.setVisible(false);
      return;
    }
    this._genderText.setText(cfg.label);
    this._genderText.setColor(cfg.color);
    this._genderText.setPosition(this._nameText.x + this._nameText.width + 3, 8);
    this._genderText.setVisible(true);
  }

  /**
   * Shows or hides the status condition badge next to the pokemon name.
   * @param {object} [status]
   */
  _updateStatusBadge(status) {
    const active = Object.entries(status || {}).find(([, v]) => v > 0);
    if (!active) {
      this._statusBadgeBg.setVisible(false);
      this._statusBadgeText.setVisible(false);
      return;
    }

    const badge = STATUS_BADGE[active[0]];
    if (!badge) {
      this._statusBadgeBg.setVisible(false);
      this._statusBadgeText.setVisible(false);
      return;
    }

    // Position badge after name (and gender symbol if visible)
    const nameRight = this._nameText.x + this._nameText.width;
    const genderRight = this._genderText.visible
      ? this._genderText.x + this._genderText.width + 2
      : nameRight;
    const bx = Math.max(nameRight, genderRight) + 4;
    const by = 8;

    this._statusBadgeBg.clear();
    this._statusBadgeBg.fillStyle(badge.bg);
    this._statusBadgeBg.fillRoundedRect(bx, by, BADGE_W, BADGE_H, 3);
    this._statusBadgeBg.setVisible(true);

    this._statusBadgeText.setText(badge.label);
    this._statusBadgeText.setColor(badge.text);
    this._statusBadgeText.setPosition(bx + BADGE_W / 2, by + 2);
    this._statusBadgeText.setVisible(true);
  }
}
