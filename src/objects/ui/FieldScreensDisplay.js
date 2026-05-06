import Phaser from 'phaser';

// ─── Battlefield geometry reference ────────────────────────────────────────
//
//  Player Pokémon bottom: x=190  y=342    (UI_Y−28)   — sprite origin, size 192
//  Enemy  Pokémon bottom: x=610  y=202    (UI_Y−168)  — sprite origin, size 128
//  Player Pokémon centre: x=190  y=246    (UI_Y−124)
//  Enemy  Pokémon centre: x=610  y=138    (UI_Y−232)
//
//  The ground rises from left to right.  Slope = (202−342)/(610−190) = −1/3.
//  Barriers are drawn as straight vertical rectangles (TILT = 0).

const TILT      = 0;    // no perspective lean — barriers stand straight up
const BAR_W     = 120;  // width of each screen slab
const OVERLAP_X = 14;   // x offset for each successive slab (in the glow direction)
const OVERLAP_Y = 10;   // y offset for each successive slab (rises toward sky)

// The two barrier zones sit at roughly 1/3 and 2/3 of the way between the
// two Pokémon, on their respective sides of the field.
const ZONE = {
  enemy: {
    // first bar's bottom-right corner; bars stack leftward (−x) and downward (+y)
    x:  500,           // right edge at bottom
    y1:  82,
    y2: 258,
    dir:  -1,          // index 1 bar is to the left of index 0
    yDir: +1,          // successive slabs shift downward
    glowSide: 'left',  // bright edge faces the player
  },
  player: {
    // first bar's bottom-left corner (x, y2); bars stack rightward (+x) and upward (−y)
    x:  290,
    y1: 160,   // top of slab (sky)
    y2: 322,   // bottom of slab (into ground)
    dir:  +1,          // index 1 bar is to the right of index 0
    yDir: -1,          // successive slabs shift upward
    glowSide: 'right', // bright edge faces the enemy
  },
};

const SCREENS = [
  { key: 'lightScreen', fillColor: 0x2020b8, fillAlpha: 0.38, glowColor: 0x90a8ff, label: 'LSC' },
  { key: 'reflect',     fillColor: 0xa06800, fillAlpha: 0.38, glowColor: 0xffdf50, label: 'REF' },
];

/** Entry hazards shown as small badges on each side's platform. */
const HAZARDS = [
  { key: 'spikes',      label: 'SPK', color: 0xd0a030, maxLayers: 3 },
  { key: 'toxicSpikes', label: 'TSP', color: 0x9040c0, maxLayers: 2 },
  { key: 'stealthRock', label: 'SRK', color: 0x808080, maxLayers: 1 },
];

// Platform centres used for hazard badge placement.
const PLATFORM = {
  player: { x: 190, y: 342 },
  enemy:  { x: 610, y: 202 },
};

/**
 * Draws field-side screen barriers (Light Screen / Reflect) as perspective-
 * correct parallelograms on the battlefield.
 *
 * Each active screen appears as a wide semi-transparent angled slab with a
 * bright glowing edge on the face pointing toward the opposing Pokémon.
 * When both screens are active on one side the slabs sit side-by-side.
 *
 * @extends Phaser.GameObjects.Container
 */
export default class FieldScreensDisplay extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this._slots = {};
    for (const [side, zone] of Object.entries(ZONE)) {
      this._slots[side] = SCREENS.map(cfg => {
        const g = scene.add.graphics();
        g.setVisible(false);
        this.add(g);

        const t = scene.add.text(0, 0, cfg.label, {
          fontFamily: 'Gen3',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        });
        t.setOrigin(0.5, 1);
        t.setVisible(false);
        this.add(t);

        return { g, t, cfg, zone };
      });
    }

    // Hazard badge slots — one per hazard type per side.
    const BADGE_W = 30, BADGE_H = 12;
    this._hazardSlots = {};
    for (const side of ['player', 'enemy']) {
      this._hazardSlots[side] = HAZARDS.map((hcfg, i) => {
        const bg = scene.add.graphics();
        bg.setVisible(false);
        this.add(bg);

        const text = scene.add.text(0, 0, '', {
          fontFamily: 'Gen3',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#ffffff',
        });
        text.setOrigin(0.5, 0.5);
        text.setVisible(false);
        this.add(text);

        return { bg, text, hcfg, badgeW: BADGE_W, badgeH: BADGE_H, index: i };
      });
    }
  }

  /**
   * @param {{ player: { lightScreen: number, reflect: number, spikes: number, toxicSpikes: number, stealthRock: boolean },
   *           enemy:  { lightScreen: number, reflect: number, spikes: number, toxicSpikes: number, stealthRock: boolean } }} screens
   */
  update(screens) {
    for (const [side, slots] of Object.entries(this._slots)) {
      const s    = screens?.[side] ?? {};
      const zone = ZONE[side];
      let drawn  = 0;

      for (const slot of slots) {
        const turns = s[slot.cfg.key] ?? 0;

        if (turns <= 0) {
          slot.g.setVisible(false);
          slot.t.setVisible(false);
          continue;
        }

        // Each successive slab shifts diagonally: in the glow direction and per-side vertically.
        const xShift = drawn * zone.dir  * OVERLAP_X;
        const yShift = drawn * zone.yDir * OVERLAP_Y;

        let xl;
        if (zone.dir === +1) {
          xl = zone.x + xShift;
        } else {
          xl = (zone.x - BAR_W) + xShift;
        }

        const xr = xl + BAR_W;
        const y1 = zone.y1 + yShift;
        const y2 = zone.y2 + yShift;
        const h    = y2 - y1;
        const lean = Math.round(h * TILT);   // top is shifted right by this amount

        const xl_top = xl + lean;
        const xr_top = xr + lean;

        slot.g.clear();

        // ── Parallelogram fill ──────────────────────────────────────────────
        slot.g.fillStyle(slot.cfg.fillColor, slot.cfg.fillAlpha);
        slot.g.beginPath();
        slot.g.moveTo(xl,     y2);
        slot.g.lineTo(xr,     y2);
        slot.g.lineTo(xr_top, y1);
        slot.g.lineTo(xl_top, y1);
        slot.g.closePath();
        slot.g.fillPath();

        // ── Glow edge (facing the opponent) ────────────────────────────────
        slot.g.lineStyle(3, slot.cfg.glowColor, 0.95);
        slot.g.beginPath();
        if (zone.glowSide === 'right') {
          slot.g.moveTo(xr,     y2);
          slot.g.lineTo(xr_top, y1);
        } else {
          slot.g.moveTo(xl,     y2);
          slot.g.lineTo(xl_top, y1);
        }
        slot.g.strokePath();

        // ── Subtle dark outline for the full shape ──────────────────────────
        slot.g.lineStyle(1, 0x000000, 0.25);
        slot.g.beginPath();
        slot.g.moveTo(xl,     y2);
        slot.g.lineTo(xr,     y2);
        slot.g.lineTo(xr_top, y1);
        slot.g.lineTo(xl_top, y1);
        slot.g.closePath();
        slot.g.strokePath();

        slot.g.setVisible(true);

        // ── Label centred on the top edge, showing turns remaining ─────────
        slot.t.setText(`${slot.cfg.label} ${turns}`);
        slot.t.setPosition((xl_top + xr_top) / 2, y1 - 2);
        slot.t.setVisible(true);

        drawn++;
      }
    }

    // ── Entry hazard badges ───────────────────────────────────────────────────
    const BW = 30, BH = 12, BGAP = 2;
    for (const side of ['player', 'enemy']) {
      const s    = screens?.[side] ?? {};
      const plat = PLATFORM[side];
      const slots = this._hazardSlots[side];
      let bx = plat.x - ((HAZARDS.length * (BW + BGAP)) / 2) + BW / 2;

      for (const slot of slots) {
        const value = s[slot.hcfg.key] ?? 0;
        const active = slot.hcfg.maxLayers > 1 ? value > 0 : !!value;

        if (!active) {
          slot.bg.setVisible(false);
          slot.text.setVisible(false);
          bx += BW + BGAP;
          continue;
        }

        const cx = bx;
        const cy = plat.y + 6;

        slot.bg.clear();
        slot.bg.fillStyle(slot.hcfg.color, 0.85);
        slot.bg.fillRoundedRect(cx - BW / 2, cy - BH / 2, BW, BH, 2);
        slot.bg.setVisible(true);

        const label = slot.hcfg.maxLayers > 1 ? `${slot.hcfg.label}×${value}` : slot.hcfg.label;
        slot.text.setText(label);
        slot.text.setPosition(cx, cy);
        slot.text.setVisible(true);

        bx += BW + BGAP;
      }
    }
  }
}
