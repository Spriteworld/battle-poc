import Phaser from 'phaser';
import HpBar from './HpBar.js';
import { GENDERS } from '@spriteworld/pokemon-data';

// ─── Layout constants ─────────────────────────────────────────────────────────
const W   = 220;
const CUT = 20;   // bottom-right diagonal cut size

// Trainer layout
const TRAINER_ROW_Y = 6;
const DIVIDER_Y     = 24;
const MON_Y         = 28;
const HP_Y          = 44;
const BADGE_Y       = 60;
const H_TRAINER     = 76;

// Wild layout (no trainer row / divider)
const MON_Y_WILD    = 8;
const HP_Y_WILD     = 26;
const BADGE_Y_WILD  = 42;
const H_WILD        = 56;

// ─── Pokéball colours ─────────────────────────────────────────────────────────
const BALL_R       = 5;
const BALL_GAP     = 13;
const BALL_ALIVE   = 0xcc1010;
const BALL_STATUS  = 0xd4900a;
const BALL_FAINTED = 0x707070;

// ─── Badge configs ────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  BURNED:    { label: 'BRN', bg: 0xf08030, text: '#ffffff' },
  POISONED:  { label: 'PSN', bg: 0xa040a0, text: '#ffffff' },
  PARALYZED: { label: 'PAR', bg: 0xf8d030, text: '#ffffff' },
  SLEEP:     { label: 'SLP', bg: 0x909090, text: '#ffffff' },
  FROZEN:    { label: 'FRZ', bg: 0x98d8d8, text: '#ffffff' },
  TOXIC:     { label: 'PSN', bg: 0x5828a0, text: '#ffffff' },
};
const POKERUS_BADGE = { label: 'PkRs', bg: 0x9040c0, text: '#ffffff' };

const BADGE_W   = 36;
const BADGE_H   = 16;
const BADGE_MAX = 4;

const STAGE_LABELS = {
  ATTACK: 'ATK', DEFENSE: 'DEF', SPECIAL_ATTACK: 'SPA',
  SPECIAL_DEFENSE: 'SPD', SPEED: 'SPE', ACCURACY: 'ACC', EVASION: 'EVA',
};
const STAGE_W   = 30;
const STAGE_H   = 12;
const STAGE_MAX = 8;

const GENDER_SYMBOL = {
  [GENDERS.MALE]:   { label: '♂', color: '#6890f0' },
  [GENDERS.FEMALE]: { label: '♀', color: '#f85888' },
};

const FONT = { fontFamily: 'Gen3', color: '#181818' };

// ─── Component ────────────────────────────────────────────────────────────────

export default class EnemyTrainerStatusBox extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);
    this._build();
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  _build() {
    const scene = this.scene;

    // Background fill (redrawn on remap)
    this._bg = new Phaser.GameObjects.Graphics(scene);
    this.add(this._bg);

    // Border stroke (redrawn on remap)
    this._border = new Phaser.GameObjects.Graphics(scene);
    this.add(this._border);

    // Trainer name
    this._trainerText = scene.add.text(10, TRAINER_ROW_Y, '', {
      ...FONT, fontSize: '12px',
    });
    this.add(this._trainerText);

    // Pokéball row
    this._ballGfx = new Phaser.GameObjects.Graphics(scene);
    this.add(this._ballGfx);

    // Divider
    this._divider = new Phaser.GameObjects.Graphics(scene);
    this._divider.lineStyle(1, 0x808080, 0.35);
    this._divider.lineBetween(8, DIVIDER_Y, W - 8, DIVIDER_Y);
    this.add(this._divider);

    // Active Pokémon name
    this._monNameText = scene.add.text(10, MON_Y, '', { ...FONT, fontSize: '13px' });
    this.add(this._monNameText);

    // Shiny indicator — separate object so it can be centered independently of the name baseline
    this._shinyText = scene.add.text(10, 0, '★', {
      fontFamily: 'Gen3',
      fontSize:   '13px',
      color:      '#181818',
    });
    this._shinyText.setOrigin(0, 0.5);
    this._shinyText.setVisible(false);
    this.add(this._shinyText);

    // Gender symbol
    this._genderText = scene.add.text(0, MON_Y, '', { fontFamily: 'Gen3', fontSize: '12px' });
    this._genderText.setVisible(false);
    this.add(this._genderText);

    // Level (right-aligned)
    this._levelText = scene.add.text(W - 8, MON_Y, '', { ...FONT, fontSize: '12px' });
    this._levelText.setOrigin(1, 0);
    this.add(this._levelText);

    // HP label
    this._hpLabel = scene.add.text(10, HP_Y + 2, 'HP', {
      ...FONT, fontSize: '10px', fontStyle: 'bold', color: '#505050',
    });
    this.add(this._hpLabel);

    // HP bar
    this._hpBar = new HpBar(scene, 30, HP_Y + 5, { width: W - 40 });
    this.add(this._hpBar);

    // Status badge slots
    this._statusBadges = Array.from({ length: BADGE_MAX }, () => {
      const badgeBg = new Phaser.GameObjects.Graphics(scene);
      badgeBg.setVisible(false);
      this.add(badgeBg);
      const badgeText = scene.add.text(0, 0, '', {
        fontFamily: 'Gen3', fontSize: '10px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3,
      });
      badgeText.setOrigin(0.5, 0.5);
      badgeText.setVisible(false);
      this.add(badgeText);
      return { bg: badgeBg, text: badgeText };
    });

    // Stage badge slots
    this._stageBadges = Array.from({ length: STAGE_MAX }, () => {
      const stageBg = new Phaser.GameObjects.Graphics(scene);
      stageBg.setVisible(false);
      this.add(stageBg);
      const stageText = scene.add.text(0, 0, '', {
        fontFamily: 'Gen3', fontSize: '9px', fontStyle: 'bold', color: '#ffffff',
      });
      stageText.setOrigin(0.5, 0);
      stageText.setVisible(false);
      this.add(stageText);
      return { bg: stageBg, text: stageText };
    });

    // ── Pokéball tooltip ───────────────────────────────────────────────────────

    this._ballMons = new Array(6).fill(null);

    // Tooltip rendered directly on the scene so it sits above everything
    this._tooltipBg   = scene.add.graphics().setDepth(100);
    this._tooltipText = scene.add.text(0, 0, '', {
      fontFamily: 'Gen3', fontSize: '10px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setDepth(101).setVisible(false);
    this._tooltipBg.setVisible(false);

    // Native mousemove gives clientX/Y which correctly handles CSS scaling / object-fit
    const canvas = scene.sys.canvas;
    this._onMouseMove = (e) => {
      const r       = canvas.getBoundingClientRect();
      const scale   = Math.min(r.width / 800, r.height / 600);
      const offsetX = (r.width  - 800 * scale) / 2;
      const offsetY = (r.height - 600 * scale) / 2;
      const x = (e.clientX - r.left - offsetX) / scale;
      const y = (e.clientY - r.top  - offsetY) / scale;
      this._checkBallHover(x, y);
    };
    this._onMouseLeave = () => this._hideTooltip();
    canvas.addEventListener('mousemove',  this._onMouseMove);
    canvas.addEventListener('mouseleave', this._onMouseLeave);

    // Clean up native listeners when the scene shuts down
    scene.events.once('shutdown', () => {
      canvas.removeEventListener('mousemove',  this._onMouseMove);
      canvas.removeEventListener('mouseleave', this._onMouseLeave);
    });

    // Draw initial background at full trainer height
    this._redrawBackground(H_TRAINER);
  }

  _redrawBackground(h) {
    this._bg.clear();
    this._bg.fillStyle(0xf8f8ec, 1);
    this._tracePath(this._bg, h);
    this._bg.fillPath();

    this._border.clear();
    this._border.lineStyle(3, 0x181818);
    this._tracePath(this._border, h);
    this._border.strokePath();
  }

  _tracePath(g, h) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(W, 0);
    g.lineTo(W, h - CUT);
    g.lineTo(W - CUT, h);
    g.lineTo(0, h);
    g.closePath();
  }

  // ─── Remap ──────────────────────────────────────────────────────────────────

  /**
   * @param {string}      trainerName
   * @param {object[]}    team
   * @param {object|null} activePokemon
   * @param {boolean}     [isWild=false]
   */
  remap(trainerName, team, activePokemon, isWild = false) {
    // Layout mode
    const monY   = isWild ? MON_Y_WILD   : MON_Y;
    const hpY    = isWild ? HP_Y_WILD    : HP_Y;
    const badgeY = isWild ? BADGE_Y_WILD : BADGE_Y;
    const boxH   = isWild ? H_WILD       : H_TRAINER;

    this._redrawBackground(boxH);

    // Trainer header
    this._trainerText.setVisible(!isWild);
    this._ballGfx.setVisible(!isWild);
    this._divider.setVisible(!isWild);

    if (!isWild) {
      this._trainerText.setText(trainerName?.toUpperCase() ?? '');
      if (activePokemon) activePokemon.seen = true;
      this._drawBalls(team ?? []);
    }

    // Reposition mon-section elements
    this._monNameText.setY(monY);
    this._genderText.setY(monY);
    this._levelText.setY(monY);
    this._hpLabel.setY(hpY + 2);
    this._hpBar.setY(hpY + 5);

    const hasMon = activePokemon != null;
    this._monNameText.setVisible(hasMon);
    this._genderText.setVisible(false);
    this._levelText.setVisible(hasMon);
    this._hpLabel.setVisible(hasMon);
    this._hpBar.setVisible(hasMon);

    if (hasMon) {
      const monName = activePokemon.getName?.() ?? '';
      this._monNameText.setX(10);
      this._monNameText.setText(monName);
      if (activePokemon.isShiny) {
        const nameCenter = this._monNameText.y + Math.round(this._monNameText.height / 2);
        this._shinyText.setY(nameCenter).setVisible(true);
        this._monNameText.setX(this._shinyText.x + this._shinyText.width + 3);
      } else {
        this._shinyText.setVisible(false);
      }
      this._levelText.setText(`Lv.${activePokemon.level}`);
      this._hpBar.update(activePokemon.currentHp, activePokemon.maxHp);
      this._updateGenderSymbol(activePokemon.gender, monY);
      this._updateStatusBadges(activePokemon.status, activePokemon.pokerus, monY);
      this._updateStageBadges(activePokemon.stages, activePokemon.volatileStatus, badgeY);
    } else {
      this._hideBadges();
    }
  }

  // ─── Pokéball row ────────────────────────────────────────────────────────────

  _drawBalls(team) {
    const g = this._ballGfx;
    g.clear();

    const SLOTS  = 6;
    const cy     = TRAINER_ROW_Y + 7;
    const startX = W - 10 - BALL_R - (SLOTS - 1) * BALL_GAP;

    for (let i = 0; i < SLOTS; i++) {
      const cx       = startX + i * BALL_GAP;
      const teamIndex = i - (SLOTS - team.length);
      const mon      = teamIndex >= 0 ? team[team.length - 1 - teamIndex] : null;

      this._ballMons[i] = mon;

      if (mon == null) {
        // Empty slot — dim outline only
        g.lineStyle(1, 0x181818, 0.35);
        g.strokeCircle(cx, cy, BALL_R);
        continue;
      }

      const fainted   = (mon.currentHp ?? 0) <= 0;
      const hasStatus = Object.values(mon.status ?? {}).some(v => v > 0);
      const color     = fainted   ? BALL_FAINTED
                      : hasStatus ? BALL_STATUS
                      :             BALL_ALIVE;

      g.fillStyle(0x181818, 1);
      g.fillCircle(cx, cy, BALL_R + 1);
      g.fillStyle(color, 1);
      g.fillCircle(cx, cy, BALL_R);
      g.fillStyle(0xffffff, fainted ? 0.4 : 1.0);
      g.fillCircle(cx, cy, 2);
    }
  }

  // ─── Ball tooltip ────────────────────────────────────────────────────────────

  _checkBallHover(x, y) {
    if (!this._ballGfx.visible) { this._hideTooltip(); return; }

    const SLOTS   = 6;
    const HIT_R   = BALL_R + 4;
    const worldCy = this.y + TRAINER_ROW_Y + 7;
    const startX  = this.x + W - 10 - BALL_R - (SLOTS - 1) * BALL_GAP;

    for (let i = 0; i < SLOTS; i++) {
      const worldCx = startX + i * BALL_GAP;
      const dx = x - worldCx;
      const dy = y - worldCy;
      if (dx * dx + dy * dy <= HIT_R * HIT_R) {
        const mon = this._ballMons[i];
        if (mon == null) { this._hideTooltip(); return; }
        const text = mon.seen
          ? `${mon.getName?.() ?? mon.name ?? '???'}  Lv.${mon.level ?? '?'}`
          : '???';
        this._showTooltip(x, y, text);
        return;
      }
    }
    this._hideTooltip();
  }

  _showTooltip(x, y, text) {
    const PAD = 5;
    this._tooltipText.setText(text);

    const tw = this._tooltipText.width;
    const th = this._tooltipText.height;
    const tx = Math.min(x - tw / 2, 800 - tw - PAD * 2 - 2);
    const ty = y - th - PAD * 2 - 6;

    this._tooltipBg.clear();
    this._tooltipBg.fillStyle(0x181818, 0.92);
    this._tooltipBg.fillRoundedRect(tx, ty, tw + PAD * 2, th + PAD * 2, 3);
    this._tooltipBg.lineStyle(1, 0x606060, 1);
    this._tooltipBg.strokeRoundedRect(tx, ty, tw + PAD * 2, th + PAD * 2, 3);
    this._tooltipBg.setVisible(true);

    this._tooltipText.setPosition(tx + PAD, ty + PAD);
    this._tooltipText.setVisible(true);
  }

  _hideTooltip() {
    this._tooltipBg.setVisible(false);
    this._tooltipText.setVisible(false);
  }

  // ─── Badge helpers ────────────────────────────────────────────────────────────

  _updateGenderSymbol(gender, monY) {
    const cfg = GENDER_SYMBOL[gender];
    if (!cfg) { this._genderText.setVisible(false); return; }
    this._genderText.setText(cfg.label);
    this._genderText.setColor(cfg.color);
    this._genderText.setPosition(this._monNameText.x + this._monNameText.width + 3, monY);
    this._genderText.setVisible(true);
  }

  _updateStatusBadges(status, pokerus, monY) {
    const badges = [];
    const active = Object.entries(status || {}).find(([, v]) => v > 0);
    if (active) { const b = STATUS_BADGE[active[0]]; if (b) badges.push(b); }
    if ((pokerus ?? 0) > 0) badges.push(POKERUS_BADGE);

    const nameRight   = this._monNameText.x + this._monNameText.width;
    const genderRight = this._genderText.visible
      ? this._genderText.x + this._genderText.width + 2
      : nameRight;
    let bx = Math.max(nameRight, genderRight) + 4;

    this._statusBadges.forEach(({ bg, text }, i) => {
      if (i >= badges.length) { bg.setVisible(false); text.setVisible(false); return; }
      const b = badges[i];
      bg.clear();
      bg.fillStyle(b.bg);
      bg.fillRoundedRect(bx, monY, BADGE_W, BADGE_H, 3);
      bg.setVisible(true);
      text.setText(b.label);
      text.setColor(b.text);
      text.setPosition(bx + BADGE_W / 2, monY + BADGE_H / 2);
      text.setVisible(true);
      bx += BADGE_W + 2;
    });
  }

  _updateStageBadges(stages = {}, volatileStatus = {}, badgeY) {
    const entries = [];
    if (volatileStatus?.leechSeed)     entries.push({ label: 'SED', color: 0x70b000, textColor: '#ffffff' });
    if (volatileStatus?.confusedTurns) entries.push({ label: 'CNF', color: 0xc030c0, textColor: '#ffffff' });
    for (const [stat, value] of Object.entries(stages)) {
      if (value !== 0) {
        const label = STAGE_LABELS[stat] ?? stat.slice(0, 3);
        entries.push({ label: `${label}${value > 0 ? '+' : ''}${value}`, color: value > 0 ? 0x2a7a2a : 0xb03030, textColor: '#ffffff' });
      }
    }

    this._stageBadges.forEach(({ bg, text }, i) => {
      if (i >= entries.length) { bg.setVisible(false); text.setVisible(false); return; }
      const e = entries[i];
      const x = 10 + i * (STAGE_W + 2);
      bg.clear();
      bg.fillStyle(e.color);
      bg.fillRoundedRect(x, badgeY, STAGE_W, STAGE_H, 2);
      bg.setVisible(true);
      text.setText(e.label);
      text.setColor(e.textColor);
      text.setPosition(x + STAGE_W / 2, badgeY);
      text.setVisible(true);
    });
  }

  _hideBadges() {
    this._statusBadges.forEach(({ bg, text }) => { bg.setVisible(false); text.setVisible(false); });
    this._stageBadges.forEach(({ bg, text }) => { bg.setVisible(false); text.setVisible(false); });
  }
}
