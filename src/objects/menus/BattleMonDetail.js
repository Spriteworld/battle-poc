import { Pokedex, GAMES, getSpeciesDisplayName } from '@spriteworld/pokemon-data';
import { drawStatsPanel } from '../common/pokemonStats.js';
import BattlePokemonSprite from '@Objects/battlescene/BattlePokemonSprite.js';
import TypeBadge, { TYPE_COLORS } from '@Objects/ui/TypeBadge.js';
import { TEXT_STYLE_BODY, TEXT_STYLE_HINT, TEXT_STYLE_SM } from './layout.js';
import { drawHpRow, drawTypeBadges } from './helpers.js';

export const TABS = ['MOVES', 'STATS', 'INFO'];

// ─── Private helpers ─────────────────────────────────────────────────────────

function blendColors(c1, c2, t = 0.5) {
  const r = Math.round(((c1 >> 16) & 0xff) + (((c2 >> 16) & 0xff) - ((c1 >> 16) & 0xff)) * t);
  const g = Math.round(((c1 >>  8) & 0xff) + (((c2 >>  8) & 0xff) - ((c1 >>  8) & 0xff)) * t);
  const b = Math.round(( c1        & 0xff) + (( c2         & 0xff) - ( c1        & 0xff)) * t);
  return (r << 16) | (g << 8) | b;
}

function _drawTabBar(scene, reg, tabs, activeTab, x, y, totalW, tabH) {
  const gap  = 6;
  const tabW = Math.floor((totalW - gap * (tabs.length - 1)) / tabs.length);
  tabs.forEach((label, i) => {
    const tx       = x + i * (tabW + gap);
    const isActive = i === activeTab;
    const bg = scene.add.graphics();
    bg.fillStyle(isActive ? 0x3399ff : 0xe0e0e0, 1);
    bg.fillRoundedRect(tx, y, tabW, tabH, 4);
    reg(bg);
    const t = scene.add.text(tx + tabW / 2, y + tabH / 2, label, {
      fontFamily: 'Gen3', fontSize: '11px',
      color: isActive ? '#ffffff' : '#555555',
      fontStyle: isActive ? 'bold' : 'normal',
    });
    t.setOrigin(0.5, 0.5);
    reg(t);
  });
}

function _drawMovesTab(scene, reg, bMon, x, y, w) {
  const moves = bMon.getMoves?.() ?? bMon.moves ?? [];
  if (moves.length === 0) {
    const t = scene.add.text(x + w / 2, y + 20, '— no moves —', TEXT_STYLE_HINT);
    t.setOrigin(0.5, 0);
    reg(t);
    return;
  }
  moves.forEach((m, i) => {
    const my = y + i * 42;
    const bg = scene.add.graphics();
    bg.fillStyle(0xeef2f8, 1);
    bg.fillRoundedRect(x, my, w, 34, 4);
    reg(bg);
    reg(scene.add.text(x + 10, my + 9, m.name, TEXT_STYLE_BODY));
    const ppCur = m.pp?.current ?? '?';
    const ppMax = m.pp?.max ?? '?';
    const ppT = scene.add.text(x + w - 10, my + 9, `PP ${ppCur}/${ppMax}`, TEXT_STYLE_SM);
    ppT.setOrigin(1, 0);
    reg(ppT);
  });
}

function _drawInfoTab(scene, reg, bMon, entry, x, y, w) {
  let rowY = y;
  const ROW = 22;

  if (bMon.nature) {
    reg(scene.add.text(x, rowY, 'Nature', TEXT_STYLE_HINT));
    reg(scene.add.text(x + 80, rowY, bMon.nature, TEXT_STYLE_SM));
    rowY += ROW;
  }
  if (bMon.ability?.name && bMon.ability.name !== 'none') {
    reg(scene.add.text(x, rowY, 'Ability', TEXT_STYLE_HINT));
    reg(scene.add.text(x + 80, rowY, bMon.ability.name, TEXT_STYLE_SM));
    rowY += ROW;
  }
  if (bMon.isShiny) {
    reg(scene.add.text(x, rowY, '✦ Shiny', { ...TEXT_STYLE_SM, color: '#ddaa00' }));
    rowY += ROW;
  }
  if (entry?.height != null) {
    reg(scene.add.text(x, rowY, 'Height', TEXT_STYLE_HINT));
    reg(scene.add.text(x + 80, rowY, `${entry.height.toFixed(1)} m`, TEXT_STYLE_SM));
    rowY += ROW;
  }
  if (entry?.weight != null) {
    reg(scene.add.text(x, rowY, 'Weight', TEXT_STYLE_HINT));
    reg(scene.add.text(x + 80, rowY, `${entry.weight.toFixed(1)} kg`, TEXT_STYLE_SM));
    rowY += ROW;
  }
}

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * Render a full-panel BattlePokemon detail view.
 *
 * @param {object} menu   - host container (provides scene, reg, dex)
 * @param {object} opts
 * @param {object} opts.bMon - BattlePokemon instance
 * @param {number} opts.x
 * @param {number} opts.y
 * @param {number} opts.w
 * @param {number} opts.h
 * @param {number} [opts.tab=0]
 */
export function drawBattleMonDetail(menu, { bMon, x, y, w, h, tab = 0 }) {
  if (!menu.dex) menu.dex = new Pokedex(GAMES.POKEMON_CHAMPIONS);

  const speciesId   = bMon.pokemon?.nat_dex_id ?? null;
  let   entry       = null;
  try   { if (speciesId != null) entry = menu.dex.getPokemonById(speciesId); } catch (_) {}

  const types       = bMon.types ?? entry?.types ?? [];
  const dexNum      = entry ? `#${String(entry.nat_dex_id).padStart(3, '0')}` : '';
  const speciesName = entry ? getSpeciesDisplayName(entry).toUpperCase() : bMon.species?.toUpperCase?.() ?? '???';
  const gender      = bMon.gender === 'male' ? ' ♂' : bMon.gender === 'female' ? ' ♀' : '';
  const { scene, reg } = menu;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const HEADER_H  = 100;
  const BALL_CX   = Math.round(x + w * 0.2);
  const BALL_CY   = y + HEADER_H;
  const BALL_R    = 68;
  const SPRITE_SZ = 90;
  const HP_X      = BALL_CX + BALL_R + 20;
  const HP_W      = (x + w) - HP_X - 20;
  const HP_Y      = y + HEADER_H + 10;
  const DIV_Y     = y + HEADER_H;
  const TAB_Y     = Math.max(DIV_Y + 44, BALL_CY + BALL_R + 10);
  const TAB_H     = 28;
  const CONTENT_Y = TAB_Y + TAB_H + 8;
  const CONTENT_X = x + 16;
  const CONTENT_W = w - 32;

  // ── Gradient header ────────────────────────────────────────────────────────
  const c1   = TYPE_COLORS[types[0]?.toLowerCase()] ?? 0x888888;
  const c2   = TYPE_COLORS[types[1]?.toLowerCase()] ?? c1;
  const midC = blendColors(c1, c2, 0.5);

  const gradBg = scene.add.graphics();
  gradBg.fillGradientStyle(midC, c2, c1, midC, 1);
  gradBg.fillRect(x, y, w, HEADER_H);
  reg(gradBg);

  // ── Title ──────────────────────────────────────────────────────────────────
  const hStyle = { fontFamily: 'Gen3', fontSize: '14px', color: '#ffffff', fontStyle: 'bold' };
  const title  = `${speciesName}${gender} (Lv.${bMon.level ?? '?'})`;
  const nameT  = scene.add.text(x + w / 2, y + 10, title, hStyle);
  nameT.setOrigin(0.5, 0);
  reg(nameT);

  // ── Type badges ────────────────────────────────────────────────────────────
  const typeCount  = Math.min(2, types.length);
  const typeBlockW = typeCount * (TypeBadge.WIDTH + 4) - 4;
  drawTypeBadges(menu, (x + w) - typeBlockW - 20, y + HEADER_H - TypeBadge.HEIGHT - 8, types);

  // ── Divider ────────────────────────────────────────────────────────────────
  const hDiv = scene.add.graphics();
  hDiv.lineStyle(1, 0xcccccc, 1);
  hDiv.lineBetween(x + 16, DIV_Y, x + w - 16, DIV_Y);
  reg(hDiv);

  // ── HP bar ─────────────────────────────────────────────────────────────────
  const currentHp = bMon.currentHp ?? bMon.maxHp;
  const maxHp     = bMon.maxHp ?? 1;
  drawHpRow(menu, HP_X, HP_Y, HP_W, currentHp, maxHp, Math.max(0, currentHp / maxHp));

  // ── Big dex number ─────────────────────────────────────────────────────────
  if (dexNum) {
    const dexBig = scene.add.text(BALL_CX + BALL_R + 10, y + HEADER_H, dexNum, {
      fontFamily: 'Gen3', fontSize: `${Math.min(64, Math.round(w * 0.1))}px`,
      color: '#ffffff', fontStyle: 'bold',
    });
    dexBig.setOrigin(0, 1);
    dexBig.setAlpha(0.3);
    reg(dexBig);
  }

  // ── Sprite ─────────────────────────────────────────────────────────────────
  const tilesetUrl = scene.data?.tilesetBaseUrl;
  if (tilesetUrl && speciesId != null) {
    reg(new BattlePokemonSprite(scene, BALL_CX, BALL_CY, {
      species: speciesId, shiny: bMon.isShiny ?? false,
      gender: bMon.gender, isBack: false,
      size: SPRITE_SZ, tilesetBaseUrl: tilesetUrl,
    }));
  }

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const activeTab = Math.max(0, Math.min(tab, TABS.length - 1));
  _drawTabBar(scene, reg, TABS, activeTab, CONTENT_X, TAB_Y, CONTENT_W, TAB_H);

  // ── Tab content ────────────────────────────────────────────────────────────
  switch (TABS[activeTab]) {
    case 'MOVES': _drawMovesTab(scene, reg, bMon, CONTENT_X, CONTENT_Y, CONTENT_W); break;
    case 'STATS': drawStatsPanel(menu, { mon: bMon, entry, x: CONTENT_X, y: CONTENT_Y, w: CONTENT_W }); break;
    case 'INFO':  _drawInfoTab(scene, reg, bMon, entry,     CONTENT_X, CONTENT_Y, CONTENT_W); break;
  }
}
