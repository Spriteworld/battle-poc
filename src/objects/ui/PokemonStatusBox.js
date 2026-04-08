import Phaser from 'phaser';
import HpBar from './HpBar.js';
import { GENDERS, EXPERIENCE_TABLES, GROWTH } from '@spriteworld/pokemon-data';

const FONT = { fontFamily: 'Gen3', color: '#181818' };

const GENDER_SYMBOL = {
  [GENDERS.MALE]:   { label: '♂', color: '#6890f0' },
  [GENDERS.FEMALE]: { label: '♀', color: '#f85888' },
};

/** Maps the status value strings from BasePokemon to badge display config. */
const STATUS_BADGE = {
  'BURNED':    { label: 'BRN', bg: 0xf08030, text: '#ffffff' },
  'POISONED':  { label: 'PSN', bg: 0xa040a0, text: '#ffffff' },
  'PARALYZED': { label: 'PAR', bg: 0xf8d030, text: '#ffffff' },
  'SLEEP':     { label: 'SLP', bg: 0x909090, text: '#ffffff' },
  'FROZEN':    { label: 'FRZ', bg: 0x98d8d8, text: '#ffffff' },
  'TOXIC':     { label: 'PSN', bg: 0x5828a0, text: '#ffffff' },
};

/** Badge configs for volatile / Pokérus conditions (shown next to name). */
const VOLATILE_BADGE = {};
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
    this._height = this._showHpNumbers ? 84 : 56;

    // Animation tracking
    this._displayExpRatio    = null; // null = not yet seeded; animate from 0 on first remap
    this._displayLevel       = null;
    this._expTween           = null;
    this._expAnimDoneCallback = null;
    this._hpNumTween         = null;
    this._displayHp          = null;

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
    this._nameText = this.scene.add.text(10, 6, '', {
      ...FONT,
      fontSize: '14px',
    });
    this.add(this._nameText);

    // Gender symbol (shown between name and level)
    this._genderText = this.scene.add.text(0, 6, '', {
      fontFamily: 'Gen3',
      fontSize: '13px',
    });
    this._genderText.setVisible(false);
    this.add(this._genderText);

    // Level (right-aligned)
    this._levelText = this.scene.add.text(w - 8, 6, '', {
      ...FONT,
      fontSize: '12px',
    });
    this._levelText.setOrigin(1, 0);
    this.add(this._levelText);

    if (this._showHpNumbers) {
      // Player: taller HP bar with numbers rendered inside it
      this._hpBar = new HpBar(this.scene, 10, 26, { width: w - 20, barHeight: 14 });
      this.add(this._hpBar);

      const hpInLabel = this.scene.add.text(16, 25, 'HP', {
        fontFamily: 'Gen3', fontSize: '10px', color: '#ffffff',
      });
      this.add(hpInLabel);

      this._hpNumText = this.scene.add.text(w - 14, 25, '', {
        fontFamily: 'Gen3', fontSize: '10px', color: '#ffffff',
      });
      this._hpNumText.setOrigin(1, 0);
      this.add(this._hpNumText);

      // EXP bar (drawn on remap)
      this._expBarGfx = new Phaser.GameObjects.Graphics(this.scene);
      this.add(this._expBarGfx);

    } else {
      // Enemy: label + thin bar
      const hpLabel = this.scene.add.text(10, 28, 'HP', {
        ...FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#505050',
      });
      this.add(hpLabel);

      this._hpBar = new HpBar(this.scene, 30, 34, { width: w - 40 });
      this.add(this._hpBar);
    }

    // Status badge slots — pre-allocate slots for primary + volatile + pokerus.
    this._statusBadges = Array.from({ length: MAX_STATUS_BADGES }, () => {
      const bg = new Phaser.GameObjects.Graphics(this.scene);
      bg.setVisible(false);
      this.add(bg);

      const text = this.scene.add.text(0, 0, '', {
        fontFamily: 'Gen3',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 1,
      });
      text.setOrigin(0.5, 0.5);
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
        fontFamily: 'Gen3',
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
  remap({ name, level, currentHp, maxHp, exp, growth, status, stages, gender, volatileStatus, pokerus }) {
    this._nameText.setText(name?.toUpperCase() ?? name);
    this._levelText.setText(`Lv.${level}`);

    // Animate HP bar
    this._hpBar.update(currentHp, maxHp);

    // Animate HP number text (player side only)
    if (this._hpNumText) {
      this._animateHpNumber(currentHp, maxHp);
    }

    // Animate EXP bar (player side only)
    if (this._expBarGfx) {
      this._animateExpBar(level, exp, growth);
    }

    this._updateGenderSymbol(gender);
    this._updateStatusBadge(status, volatileStatus, pokerus);
    this._updateStageBadges(stages, volatileStatus);
  }

  _expRatioFor(level, exp, growth) {
    const table = EXPERIENCE_TABLES[growth ?? GROWTH.MEDIUM_FAST] ?? EXPERIENCE_TABLES[GROWTH.MEDIUM_FAST];
    if ((level ?? 1) >= 100) return 1;
    const lo = table[(level ?? 1) - 1] ?? 0;
    const hi = table[level ?? 1]       ?? lo + 1;
    return hi > lo ? Math.max(0, Math.min(1, ((exp ?? lo) - lo) / (hi - lo))) : 0;
  }

  _drawExpBarRatio(ratio) {
    const g = this._expBarGfx;
    g.clear();
    const W = this._width - 20;
    const x = 10;
    const y = 46;
    const H = 4;
    g.fillStyle(0xa8a8a8);
    g.fillRect(x, y, W, H);
    const fillW = Math.max(0, Math.floor(W * ratio));
    if (fillW > 0) {
      g.fillStyle(0x4848f8);
      g.fillRect(x, y, fillW, H);
    }
  }

  _animateExpBar(level, exp, growth) {
    const targetRatio = this._expRatioFor(level, exp, growth);

    // First call — seed display state without animation.
    if (this._displayExpRatio === null) {
      this._displayExpRatio = targetRatio;
      this._displayLevel    = level;
      this._drawExpBarRatio(targetRatio);
      this._fireExpDone();
      return;
    }

    // If the pokemon levelled up the bar should wrap: animate to full,
    // then snap to 0 and animate to the new ratio.
    if (this._displayLevel !== null && level > this._displayLevel) {
      if (this._expTween) { this._expTween.stop(); this._expTween = null; }

      const proxy = { ratio: this._displayExpRatio };
      this._expTween = this.scene.tweens.add({
        targets:  proxy,
        ratio:    1,
        duration: Math.max(100, (1 - this._displayExpRatio) * 600),
        ease:     'Linear',
        onUpdate: () => {
          this._displayExpRatio = proxy.ratio;
          this._drawExpBarRatio(proxy.ratio);
        },
        onComplete: () => {
          // Snap to 0, then animate to new level's progress.
          this._displayExpRatio = 0;
          this._displayLevel    = level;
          proxy.ratio = 0;
          this._expTween = this.scene.tweens.add({
            targets:  proxy,
            ratio:    targetRatio,
            duration: Math.max(100, targetRatio * 600),
            ease:     'Linear',
            onUpdate: () => {
              this._displayExpRatio = proxy.ratio;
              this._drawExpBarRatio(proxy.ratio);
            },
            onComplete: () => {
              this._displayExpRatio = targetRatio;
              this._expTween = null;
              this._fireExpDone();
            },
          });
        },
      });
      return;
    }

    this._displayLevel = level;

    if (this._expTween) { this._expTween.stop(); this._expTween = null; }

    if (Math.abs(this._displayExpRatio - targetRatio) < 0.001) {
      this._displayExpRatio = targetRatio;
      this._drawExpBarRatio(targetRatio);
      this._fireExpDone();
      return;
    }

    const proxy = { ratio: this._displayExpRatio };
    this._expTween = this.scene.tweens.add({
      targets:  proxy,
      ratio:    targetRatio,
      duration: Math.min(800, Math.max(150, Math.abs(targetRatio - this._displayExpRatio) * 1000)),
      ease:     'Linear',
      onUpdate: () => {
        this._displayExpRatio = proxy.ratio;
        this._drawExpBarRatio(proxy.ratio);
      },
      onComplete: () => {
        this._displayExpRatio = targetRatio;
        this._expTween = null;
        this._fireExpDone();
      },
    });
  }

  /**
   * Fires and clears the stored EXP animation done callback.
   * Called at every terminal point of _animateExpBar.
   */
  _fireExpDone() {
    const cb = this._expAnimDoneCallback;
    this._expAnimDoneCallback = null;
    cb?.();
  }

  /**
   * Registers a callback to fire once the current EXP bar animation finishes.
   * If no animation is in progress, fires on the next frame.
   * Only meaningful on the player status box (which has an EXP bar).
   * @param {Function} callback
   */
  waitForExpAnimation(callback) {
    if (!this._expBarGfx || !this._expTween) {
      this.scene.time.delayedCall(0, callback);
      return;
    }
    this._expAnimDoneCallback = callback;
  }

  _animateHpNumber(currentHp, maxHp) {
    const startHp = this._displayHp ?? currentHp;

    if (this._hpNumTween) { this._hpNumTween.stop(); this._hpNumTween = null; }

    if (startHp === currentHp) {
      this._displayHp = currentHp;
      this._hpNumText.setText(`${currentHp}/${maxHp}`);
      return;
    }

    const proxy = { hp: startHp };
    const duration = Math.min(800, Math.max(150, Math.abs(currentHp - startHp) / maxHp * 1200));
    this._hpNumTween = this.scene.tweens.add({
      targets:  proxy,
      hp:       currentHp,
      duration,
      ease:     'Linear',
      onUpdate: () => {
        this._displayHp = Math.round(proxy.hp);
        this._hpNumText.setText(`${this._displayHp}/${maxHp}`);
      },
      onComplete: () => {
        this._displayHp = currentHp;
        this._hpNumText.setText(`${currentHp}/${maxHp}`);
        this._hpNumTween = null;
      },
    });
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
    this._genderText.setPosition(this._nameText.x + this._nameText.width + 3, 6);
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
    // y position: below the EXP bar (player) or below the HP bar (enemy)
    const badgeY = this._showHpNumbers ? 56 : 42;

    // Build the list: leech seed first, confusion, then non-zero stat stages.
    const entries = [];
    if (volatileStatus?.leechSeed) {
      entries.push({ label: 'SEED', color: 0x70b000, textColor: '#ffffff' });
    }
    if (volatileStatus?.confusedTurns) {
      entries.push({ label: 'CONF', color: 0xc030c0, textColor: '#ffffff' });
    }
    if (volatileStatus?.yawnCounter) {
      entries.push({ label: 'DRW', color: 0x908060, textColor: '#ffffff' });
    }
    if (volatileStatus?.infatuated) {
      entries.push({ label: 'INF', color: 0xe060a0, text: '#ffffff' });
    }
    if (volatileStatus?.encored) {
      entries.push({ label: 'ENC', color: 0xe07018, text: '#ffffff' });
    }
    
    for (const [stat, value] of Object.entries(stages)) {
      if (value !== 0) {
        const label = STAGE_LABELS[stat] ?? stat.slice(0, 3);
        const sign  = value > 0 ? '+' : '';
        entries.push({ label: `${label}${sign}${value}`, color: value > 0 ? 0x2a7a2a : 0xb03030, textColor: '#ffffff' });
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
      text.setPosition(x + STAGE_BADGE_W / 2, badgeY);
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
    const by = 6;

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
      text.setPosition(bx + BADGE_W / 2, by + BADGE_H / 2);
      text.setVisible(true);

      bx += BADGE_W + 2;
    });
  }
}
