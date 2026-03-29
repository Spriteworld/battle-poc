import Phaser from 'phaser';
import { Pokedex, GAMES } from '@spriteworld/pokemon-data';
import BattlePokemonSprite from '@Objects/battlescene/BattlePokemonSprite.js';
import {
  SX, SY, SW, SH,
  TEAM_PAD_X, TEAM_START_Y,
  HERO_W, HERO_H, HERO_SPRITE, HERO_TEXT_X,
  BENCH_X_OFF, BENCH_W, BENCH_H, BENCH_GAP,
  TEXT_STYLE_BOLD, TEXT_STYLE_HINT, TEXT_STYLE_SM,
} from './layout.js';
import { slotColors, drawHpRow, drawTypeBadges } from './helpers.js';
import { drawBattleMonDetail } from './BattleMonDetail.js';

// Action panel — sits in the right margin (bench slots end at BENCH_X_OFF + BENCH_W = 566)
const ACTION_ITEMS  = ['Switch', 'Details', 'Cancel'];
const ACTION_X      = BENCH_X_OFF + BENCH_W + 14;  // 580
const ACTION_Y      = SY + TEAM_START_Y + 2 * (BENCH_H + BENCH_GAP); // vertically centred-ish
const ACTION_W      = SW - ACTION_X - 16;           // fills remaining width
const ACTION_ITEM_H = 40;
const ACTION_PAD    = 12;
const ACTION_H      = ACTION_ITEMS.length * ACTION_ITEM_H + ACTION_PAD * 2;

/**
 * Full-screen team view for the battle system.
 *
 * Modes:
 *  'list'   — navigate/select slots; confirm on a pokemon → 'action' mode
 *  'action' — Switch / Details / Cancel overlay on the right margin
 *  'detail' — view pokemon stats/moves/info; confirm → emit switch event; back() → 'action'
 *
 * @extends Phaser.GameObjects.Container
 */
export default class BattleTeamScreen extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    this.name = 'PokemonTeamMenu';

    this._party       = [];
    this._hasCancel   = false;
    this._cursor      = 0;
    this._subTexts    = [];
    this.dex          = null;

    this._mode        = 'list'; // 'list' | 'action' | 'detail'
    this._actionSlot  = 0;
    this._actionCursor = 0;
    this._actionItems  = ACTION_ITEMS;
    this._detailSlot  = 0;
    this._detailTab   = 0;

    this.reg = this.reg.bind(this);

    const bg = scene.add.graphics();
    bg.fillStyle(0xf0f4f8, 1);
    bg.fillRect(0, 0, SW, SH);
    this.add(bg);

    scene.add.existing(this);
  }

  // ─── Menu duck-type interface ─────────────────────────────────────────────

  getName() { return 'PokemonTeamMenu'; }

  select(_index) {
    this._mode        = 'list';
    this._cursor      = 0;
    this._actionCursor = 0;
    this._detailTab   = 0;
    this._rebuild();
  }

  deselect() {
    this._cursor      = 0;
    this._mode        = 'list';
    this._actionCursor = 0;
    this._detailTab   = 0;
  }

  clear() {
    this._clearSubTexts();
    this._party       = [];
    this._hasCancel   = false;
    this._cursor      = 0;
    this._mode        = 'list';
    this._actionSlot  = 0;
    this._actionCursor = 0;
    this._actionItems  = ACTION_ITEMS;
    this._detailSlot  = 0;
    this._detailTab   = 0;
  }

  /**
   * Virtual config.menuItems — used by Scene2's Escape/X cancel shortcut.
   * Action and detail modes both handle X via back(), so return empty in those cases.
   */
  get config() {
    if (this._mode === 'action' || this._mode === 'detail') return { menuItems: [] };
    const total = this._party.length + (this._hasCancel ? 1 : 0);
    return {
      menuItems: Array.from({ length: total }, (_, i) => ({
        text: () => (this._hasCancel && i === this._party.length) ? 'cancel' : 'pokemon',
      })),
    };
  }

  // ─── Population ──────────────────────────────────────────────────────────

  populate(pokemonArray, { showCancel = true, actionItems = null } = {}) {
    this._party       = pokemonArray;
    this._hasCancel   = showCancel;
    this._actionItems = actionItems ?? ACTION_ITEMS;
    this._cursor      = 0;
    this._actionCursor = 0;
    this._mode        = 'list';
    this._rebuild();
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  moveSelectionUp() {
    if (this._mode === 'action') {
      this._actionCursor = (this._actionCursor - 1 + this._actionItems.length) % this._actionItems.length;
      this._rebuild();
      return;
    }
    if (this._mode === 'detail') {
      const idx = this._detailSlot;
      if (idx > 0) { this._detailSlot = idx - 1; this._detailTab = 0; this._rebuild(); }
      return;
    }
    const c = this._cursor;
    if (c === 0) return;
    this._cursor = c === 1 ? 0 : c - 1;
    this._rebuild();
  }

  moveSelectionDown() {
    if (this._mode === 'action') {
      this._actionCursor = (this._actionCursor + 1) % this._actionItems.length;
      this._rebuild();
      return;
    }
    if (this._mode === 'detail') {
      const idx = this._detailSlot;
      if (idx < this._party.length - 1) { this._detailSlot = idx + 1; this._detailTab = 0; this._rebuild(); }
      return;
    }
    const total = this._party.length + (this._hasCancel ? 1 : 0);
    const c = this._cursor;
    if (c < total - 1) {
      this._cursor = c === 0 ? Math.min(1, total - 1) : c + 1;
      this._rebuild();
    }
  }

  moveSelectionLeft() {
    if (this._mode === 'action') return;
    if (this._mode === 'detail') {
      this._detailTab = (this._detailTab - 1 + 3) % 3;
      this._rebuild();
      return;
    }
    if (this._cursor > 0) { this._cursor = 0; this._rebuild(); }
  }

  moveSelectionRight() {
    if (this._mode === 'action') return;
    if (this._mode === 'detail') {
      this._detailTab = (this._detailTab + 1) % 3;
      this._rebuild();
      return;
    }
    if (this._cursor === 0 && this._party.length + (this._hasCancel ? 1 : 0) > 1) {
      this._cursor = 1;
      this._rebuild();
    }
  }

  confirm() {
    if (this._mode === 'detail') {
      this.scene.events.emit('pokemonteammenu-select-option-' + this._detailSlot);
      return;
    }

    if (this._mode === 'action') {
      const label = this._actionItems[this._actionCursor];
      if (label === 'Details') {
        this._detailSlot = this._actionSlot;
        this._detailTab  = 0;
        this._mode       = 'detail';
        this._rebuild();
      } else if (label === 'Cancel') {
        this._mode = 'list';
        this._rebuild();
      } else {
        // 'Switch', 'Use', or any custom confirm label
        this.scene.events.emit('pokemonteammenu-select-option-' + this._actionSlot);
      }
      return;
    }

    // list mode
    const idx = this._cursor;
    if (this._hasCancel && idx >= this._party.length) {
      this.scene.events.emit('pokemonteammenu-select-option-' + this._party.length);
      return;
    }
    // Enter action mode for the selected Pokémon
    this._actionSlot   = idx;
    this._actionCursor = 0;
    this._mode         = 'action';
    this._rebuild();
  }

  back() {
    if (this._mode === 'detail') {
      // Always return to action mode — detail is entered from there
      this._mode      = 'action';
      this._detailTab = 0;
      this._rebuild();
      return true;
    }
    if (this._mode === 'action') {
      this._mode = 'list';
      this._rebuild();
      return true;
    }
    return false;
  }

  // ─── Registration / cleanup ───────────────────────────────────────────────

  reg(obj) {
    this.add(obj);
    this._subTexts.push(obj);
    return obj;
  }

  _clearSubTexts() {
    this._subTexts.forEach(obj => { try { obj.destroy(); } catch (_) {} });
    this._subTexts = [];
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  _rebuild() {
    this._clearSubTexts();
    if      (this._mode === 'detail') this._buildDetail();
    else if (this._mode === 'action') this._buildAction();
    else                              this._buildList();
  }

  _buildDetail() {
    const bMon = this._party[this._detailSlot];
    if (!bMon) { this._mode = 'action'; this._buildAction(); return; }

    drawBattleMonDetail(this, {
      bMon, x: SX, y: SY, w: SW, h: SH, tab: this._detailTab,
    });

    const { scene, reg } = this;
    reg(scene.add.text(SX + 16, SY + SH - 22, '◄►  tab  ·  ▲▼  member  ·  Z  switch  ·  X  back', TEXT_STYLE_HINT));
  }

  /** Renders the team list plus the action panel in the right margin. */
  _buildAction() {
    this._buildListSlots(this._actionSlot);

    const { scene, reg } = this;
    const items  = this._actionItems;
    const panelH = items.length * ACTION_ITEM_H + ACTION_PAD * 2;

    // Panel background
    const g = scene.add.graphics();
    g.fillStyle(0x1a1a3a, 1);
    g.fillRoundedRect(ACTION_X, ACTION_Y, ACTION_W, panelH, 8);
    g.lineStyle(2, 0x181818, 1);
    g.strokeRoundedRect(ACTION_X, ACTION_Y, ACTION_W, panelH, 8);
    reg(g);

    // Action items
    items.forEach((label, i) => {
      const iy       = ACTION_Y + ACTION_PAD + i * ACTION_ITEM_H;
      const selected = i === this._actionCursor;
      const color    = selected ? '#f8e030' : '#f0ece4';
      const prefix   = selected ? '►' : ' ';
      const t = scene.add.text(ACTION_X + ACTION_PAD, iy + (ACTION_ITEM_H - 16) / 2,
        prefix + label,
        { fontFamily: 'Gen3', fontSize: '16px', color, stroke: '#181818', strokeThickness: 1 }
      );
      reg(t);
    });

    reg(scene.add.text(SX + 16, SY + SH - 22, '▲▼  select  ·  Z  confirm  ·  X  back', TEXT_STYLE_HINT));
  }

  _buildList() {
    this._buildListSlots(this._cursor);
    const { scene, reg } = this;
    reg(scene.add.text(SX + 16, SY + SH - 22, 'Z  select  ·  X  back / cancel', TEXT_STYLE_HINT));
  }

  /** Renders the team slots with a given slot index highlighted. */
  _buildListSlots(cursorIdx) {
    if (!this.dex) this.dex = new Pokedex(GAMES.POKEMON_FIRE_RED);
    const { scene, reg } = this;

    reg(scene.add.text(SX + TEAM_PAD_X, SY + 14, 'POKÉMON', TEXT_STYLE_BOLD));

    const heroX     = SX + TEAM_PAD_X;
    const heroY     = SY + TEAM_START_Y;
    const cancelIdx = this._party.length;

    for (let i = 0; i < 6; i++) {
      const isCancelSlot = this._hasCancel && i === cancelIdx;
      const mon = this._party[i] ?? null;
      if (!mon && !isCancelSlot) continue;

      const state = cursorIdx === i ? 'cursor' : 'normal';

      if (i === 0) {
        if (isCancelSlot) this._buildCancelSlot(heroX, heroY, HERO_W, HERO_H, state);
        else              this._buildHeroSlot(heroX, heroY, mon, state);
      } else {
        const x = SX + BENCH_X_OFF;
        const y = heroY + (i - 1) * (BENCH_H + BENCH_GAP);
        if (isCancelSlot) this._buildCancelSlot(x, y, BENCH_W, BENCH_H, state);
        else              this._buildBenchSlot(x, y, mon, state);
      }
    }
  }

  _buildHeroSlot(x, y, bMon, state) {
    const { scene, reg } = this;
    const speciesId  = bMon.pokemon?.nat_dex_id ?? bMon.species;
    const currentHp  = bMon.currentHp ?? 0;
    const maxHp      = bMon.maxHp ?? 1;
    const hpRatio    = Math.max(0, currentHp / maxHp);
    const types      = bMon.types ?? [];
    const tilesetUrl = scene.data?.tilesetBaseUrl;

    let speciesName = `#${speciesId}`;
    try { speciesName = this.dex.getPokemonById(speciesId)?.species?.toUpperCase() ?? speciesName; } catch (_) {}

    const gender = bMon.gender === 'male' ? ' ♂' : bMon.gender === 'female' ? ' ♀' : '';
    const { bg: bgColor, border, lw } = slotColors(state);
    const tx = x + HERO_TEXT_X;

    const g = scene.add.graphics();
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(x, y, HERO_W, HERO_H, 8);
    g.lineStyle(lw, border, 1);
    g.strokeRoundedRect(x, y, HERO_W, HERO_H, 8);
    reg(g);

    if (tilesetUrl) {
      reg(new BattlePokemonSprite(scene, x + 8 + HERO_SPRITE / 2, y + 8 + HERO_SPRITE / 2, {
        species: speciesId, shiny: bMon.isShiny ?? false,
        gender: bMon.gender, isBack: false,
        size: HERO_SPRITE, tilesetBaseUrl: tilesetUrl,
      }));
    }

    reg(scene.add.text(tx, y + 10, speciesName + gender, TEXT_STYLE_BOLD));

    const lvT = scene.add.text(x + HERO_W - 8, y + 10, `Lv.${bMon.level ?? '?'}`, { ...TEXT_STYLE_SM, align: 'right' });
    lvT.setOrigin(1, 0);
    reg(lvT);

    drawTypeBadges(this, tx, y + 30, types);

    if (bMon.nature)        reg(scene.add.text(tx, y + 56, bMon.nature, TEXT_STYLE_SM));
    if (bMon.ability?.name) reg(scene.add.text(tx, y + 70, bMon.ability.name, TEXT_STYLE_SM));

    drawHpRow(this, x + 8, y + 96, HERO_W - 16, currentHp, maxHp, hpRatio);
  }

  _buildBenchSlot(x, y, bMon, state) {
    const BENCH_SPRITE = 48;
    const TEXT_X = x + BENCH_SPRITE + 12;
    const TEXT_W = BENCH_W - BENCH_SPRITE - 20;

    const { scene, reg } = this;
    const speciesId  = bMon.pokemon?.nat_dex_id ?? bMon.species;
    const currentHp  = bMon.currentHp ?? 0;
    const maxHp      = bMon.maxHp ?? 1;
    const hpRatio    = Math.max(0, currentHp / maxHp);
    const tilesetUrl = scene.data?.tilesetBaseUrl;

    let speciesName = `#${speciesId}`;
    try { speciesName = this.dex.getPokemonById(speciesId)?.species?.toUpperCase() ?? speciesName; } catch (_) {}

    const gender = bMon.gender === 'male' ? ' ♂' : bMon.gender === 'female' ? ' ♀' : '';
    const { bg: bgColor, border, lw } = slotColors(state);

    const g = scene.add.graphics();
    g.fillStyle(bgColor, 1);
    g.fillRoundedRect(x, y, BENCH_W, BENCH_H, 6);
    g.lineStyle(lw, border, 1);
    g.strokeRoundedRect(x, y, BENCH_W, BENCH_H, 6);
    reg(g);

    if (tilesetUrl) {
      const spriteY = y + Math.floor((BENCH_H - BENCH_SPRITE) / 2) + BENCH_SPRITE / 2;
      reg(new BattlePokemonSprite(scene, x + 8 + BENCH_SPRITE / 2, spriteY, {
        species: speciesId, shiny: bMon.isShiny ?? false,
        gender: bMon.gender, isBack: false,
        size: BENCH_SPRITE, tilesetBaseUrl: tilesetUrl,
      }));
    }

    reg(scene.add.text(TEXT_X, y + 8, speciesName + gender, TEXT_STYLE_BOLD));

    const lvT = scene.add.text(x + BENCH_W - 8, y + 8, `Lv.${bMon.level ?? '?'}`, { ...TEXT_STYLE_SM, align: 'right' });
    lvT.setOrigin(1, 0);
    reg(lvT);

    drawHpRow(this, TEXT_X, y + 32, TEXT_W, currentHp, maxHp, hpRatio);
  }

  _buildCancelSlot(x, y, w, h, state) {
    const { scene, reg } = this;
    const isCursor = state === 'cursor';

    const g = scene.add.graphics();
    if (isCursor) { g.fillStyle(0xdce8f0, 1); g.fillRoundedRect(x, y, w, h, 6); }
    g.lineStyle(isCursor ? 3 : 2, isCursor ? 0x3399ff : 0xcccccc, 1);
    g.strokeRoundedRect(x, y, w, h, 6);
    reg(g);

    const t = scene.add.text(x + w / 2, y + h / 2, 'CANCEL', { ...TEXT_STYLE_BOLD, align: 'center' });
    t.setOrigin(0.5, 0.5);
    reg(t);
  }
}
