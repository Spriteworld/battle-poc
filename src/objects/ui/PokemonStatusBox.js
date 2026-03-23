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
  'TOXIC':     { label: 'PSN', bg: 0x5828a0, text: '#ffffff' },
};

/** Badge configs for volatile / Pokérus conditions. */
const VOLATILE_BADGE = {
  infatuated:   { label: 'INF', bg: 0xe060a0, text: '#ffffff' },
  yawnCounter:  { label: 'DRW', bg: 0xd4a010, text: '#181818' },
  encored:      { label: 'ENC', bg: 0xe07018, text: '#ffffff' },
  confusedTurns: { label: 'CNF', bg: 0xc030c0, text: '#ffffff' },
};
const POKERUS_BADGE = { label: 'PkRs', bg: 0x9040c0, text: '#ffffff' };

/** Maximum number of simultaneous condition badges (primary + volatile + pokerus). */
const MAX_STATUS_BADGES = 6;

const BADGE_W = 36;
const BADGE_H = 16;

/** Maps BattlePokemon stage keys to short display labels. */
const STAGE_LABELS = {
  ATTACK:          'ATK',
  DEFENSE:         'DEF',
  SPECIAL_ATTACK:  'SPA',
  SPECIAL_DEFENSE: 'SPD',
  SPEED:           'SPE',
  ACCURACY:        'ACC',
  EVASION:         'EVA',
};

const STAGE_BADGE_W = 30;
const STAGE_BADGE_H = 12;

/**
 * Gen 3-style status box displaying a Pokémon's name, level, and HP bar.
 *
 * Enemy variant: name + level + HP bar (no numbers).  Has a diagonal cut on the bottom-right corner.
 * Player variant: name + level + HP bar + current/max HP numbers.  Has a diagonal cut on the top-left corner.
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
   * @param {boolean} [config.isEnemy=false]       - Slant bottom-right corner (enemy) vs top-left (player)
   * @param {number}  [config.width=220]
   */
  constructor(scene, x, y, config = {}) {
    super(scene, x, y);
    this._showHpNumbers = config.showHpNumbers ?? false;
    this._isEnemy = config.isEnemy ?? false;
    this._width = config.width ?? 220;
    this._height = this._showHpNumbers ? 80 : 56;
    scene.add.existing(this);
    this._build();
  }

  /**
   * Draws the box outline polygon into a Graphics object.
   * Enemy: bottom-right diagonal cut.  Player: top-left diagonal cut.
   * @param {Phaser.GameObjects.Graphics} g
   */
  _tracePath(g) {
    const w = this._width;
    const h = this._height;
    const CUT = 20; // diagonal cut size in px
    g.beginPath();
    if (this._isEnemy) {
      // bottom-right slant: (0,0) → (w,0) → (w,h-CUT) → (w-CUT,h) → (0,h)
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      g.lineTo(w, h - CUT);
      g.lineTo(w - CUT, h);
      g.lineTo(0, h);
    } else {
      // top-left slant: (CUT,0) → (w,0) → (w,h) → (0,h) → (0,CUT)
      g.moveTo(CUT, 0);
      g.lineTo(w, 0);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.lineTo(0, CUT);
    }
    g.closePath();
  }

  _build() {
    const w = this._width;
    const h = this._height;

    // Background — near-white cream fill using polygon path
    const bg = new Phaser.GameObjects.Graphics(this.scene);
    bg.fillStyle(0xf8f8ec, 1);
    this._tracePath(bg);
    bg.fillPath();
    this.add(bg);

    // Border — dark outline stroked over the same path
    const border = new Phaser.GameObjects.Graphics(this.scene);
    border.lineStyle(3, 0x181818);
    this._tracePath(border);
    border.strokePath();
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

    // Status badge slots — pre-allocate slots for primary + volatile + pokerus.
    this._statusBadges = Array.from({ length: MAX_STATUS_BADGES }, () => {
      const bg = new Phaser.GameObjects.Graphics(this.scene);
      bg.setVisible(false);
      this.add(bg);

      const text = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      text.setOrigin(0.5, 0);
      text.setVisible(false);
      this.add(text);

      return { bg, text };
    });

    // Stat stage badges — pre-allocate slots for 7 stats + leech seed indicator.
    this._stageBadges = Array.from({ length: 8 }, () => {
      const bg = new Phaser.GameObjects.Graphics(this.scene);
      bg.setVisible(false);
      this.add(bg);

      const text = this.scene.add.text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      text.setOrigin(0.5, 0);
      text.setVisible(false);
      this.add(text);

      return { bg, text };
    });
  }

  /**
   * Refreshes all displayed values.
   * @param {object} data
   * @param {string} data.name
   * @param {number} data.level
   * @param {number} data.currentHp
   * @param {number} data.maxHp
   * @param {object} [data.status]         - BattlePokemon status object (keys are STATUS values)
   * @param {object} [data.stages]         - BattlePokemon stages object (ATTACK, DEFENSE, …)
   * @param {string} [data.gender]         - GENDERS constant value
   * @param {object} [data.volatileStatus] - BattlePokemon volatile status (leechSeed, etc.)
   * @param {number} [data.pokerus]        - Pokérus value (>0 means infected)
   */
  remap({ name, level, currentHp, maxHp, status, stages, gender, volatileStatus, pokerus }) {
    this._nameText.setText(name);
    this._levelText.setText(`Lv.${level}`);
    this._hpBar.update(currentHp, maxHp);
    if (this._hpNumText) {
      this._hpNumText.setText(`${currentHp}/${maxHp}`);
    }
    this._updateGenderSymbol(gender);
    this._updateStatusBadge(status, volatileStatus, pokerus);
    this._updateStageBadges(stages, volatileStatus);
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
   * Renders one small badge per non-zero stat stage below the HP bar, plus a
   * leech seed indicator when the Pokémon is seeded.
   * Boosts are green, drops are red. Label format: "ATK+2", "DEF-1", etc.
   * @param {object} [stages]
   * @param {object} [volatileStatus]
   */
  _updateStageBadges(stages = {}, volatileStatus = {}) {
    // y position: below the HP bar (enemy) or below the HP numbers (player)
    const badgeY = this._showHpNumbers ? 63 : 42;

    // Build the list: leech seed first (if active), then non-zero stat stages.
    const entries = [];
    if (volatileStatus?.leechSeed) {
      entries.push({ label: 'SED', color: 0x70b000, textColor: '#ffffff', fixed: true });
    }
    for (const [stat, value] of Object.entries(stages)) {
      if (value !== 0) {
        const label = STAGE_LABELS[stat] ?? stat.slice(0, 3);
        const sign  = value > 0 ? '+' : '';
        entries.push({ label: `${label}${sign}${value}`, color: value > 0 ? 0x2a7a2a : 0xb03030, textColor: '#ffffff', fixed: false });
      }
    }

    this._stageBadges.forEach(({ bg, text }, i) => {
      if (i >= entries.length) {
        bg.setVisible(false);
        text.setVisible(false);
        return;
      }

      const entry = entries[i];
      const x = 10 + i * (STAGE_BADGE_W + 2);

      bg.clear();
      bg.fillStyle(entry.color);
      bg.fillRoundedRect(x, badgeY, STAGE_BADGE_W, STAGE_BADGE_H, 2);
      bg.setVisible(true);

      text.setText(entry.label);
      text.setColor(entry.textColor);
      text.setPosition(x + STAGE_BADGE_W / 2, badgeY + 1);
      text.setVisible(true);
    });
  }

  /**
   * Shows condition badges (primary status, volatile status, Pokérus) next to the name.
   * Up to MAX_STATUS_BADGES are shown, laid out left-to-right after the name/gender.
   * @param {object} [status]
   * @param {object} [volatileStatus]
   * @param {number} [pokerus]
   */
  _updateStatusBadge(status, volatileStatus, pokerus) {
    const badges = [];

    // Primary status (at most one can be active)
    const active = Object.entries(status || {}).find(([, v]) => v > 0);
    if (active) {
      const badge = STATUS_BADGE[active[0]];
      if (badge) badges.push(badge);
    }

    // Volatile statuses
    for (const [key, cfg] of Object.entries(VOLATILE_BADGE)) {
      if (volatileStatus?.[key]) badges.push(cfg);
    }

    // Pokérus
    if (pokerus > 0) badges.push(POKERUS_BADGE);

    // Position starting after name (and gender symbol if visible)
    const nameRight = this._nameText.x + this._nameText.width;
    const genderRight = this._genderText.visible
      ? this._genderText.x + this._genderText.width + 2
      : nameRight;
    let bx = Math.max(nameRight, genderRight) + 4;
    const by = 8;

    this._statusBadges.forEach(({ bg, text }, i) => {
      if (i >= badges.length) {
        bg.setVisible(false);
        text.setVisible(false);
        return;
      }

      const badge = badges[i];
      bg.clear();
      bg.fillStyle(badge.bg);
      bg.fillRoundedRect(bx, by, BADGE_W, BADGE_H, 3);
      bg.setVisible(true);

      text.setText(badge.label);
      text.setColor(badge.text);
      text.setPosition(bx + BADGE_W / 2, by + 2);
      text.setVisible(true);

      bx += BADGE_W + 2;
    });
  }
}
