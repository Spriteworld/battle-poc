import Phaser from 'phaser';

// ─── Battlefield geometry reference ────────────────────────────────────────
//
//  Player Pokémon centre: x=190  y=280    (UI_Y−90)
//  Enemy  Pokémon centre: x=610  y=172    (UI_Y−198)
//  Player ground level:   x=190  y=342    (UI_Y−28)
//  Enemy  ground level:   x=610  y=202    (UI_Y−168)
//
//  The ground rises from left to right.  Slope = (202−342)/(610−190) = −1/3.
//  Barriers are drawn as straight vertical rectangles (TILT = 0).

const TILT = 0;      // no perspective lean — barriers stand straight up
const BAR_W   = 120;  // width of each screen slab (wider as requested)
const BAR_GAP = 5;   // gap between two stacked slabs on the same side

// The two barrier zones sit at roughly 1/3 and 2/3 of the way between the
// two Pokémon, on their respective sides of the field.
const ZONE = {
  player: {
    // first bar's bottom-left corner (x, y2); bars stack rightward (+x)
    x:  290,
    y1: 160,   // top of slab (sky)
    y2: 322,   // bottom of slab (into ground)
    dir: +1,          // index 1 bar is to the right of index 0
    glowSide: 'right', // bright edge faces the enemy
  },
  enemy: {
    // first bar's bottom-right corner; bars stack leftward (−x)
    x:  500,           // right edge at bottom
    y1:  82,
    y2: 258,
    dir: -1,           // index 1 bar is to the left of index 0
    glowSide: 'left',  // bright edge faces the player
  },
};

const SCREENS = [
  { key: 'lightScreen', fillColor: 0x2020b8, fillAlpha: 0.38, glowColor: 0x90a8ff, label: 'LSC' },
  { key: 'reflect',     fillColor: 0xa06800, fillAlpha: 0.38, glowColor: 0xffdf50, label: 'REF' },
];

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
  }

  /**
   * @param {{ player: { lightScreen: number, reflect: number },
   *           enemy:  { lightScreen: number, reflect: number } }} screens
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

        // Compute the bottom-left x of this slab.
        let xl;
        if (zone.dir === +1) {
          xl = zone.x + drawn * (BAR_W + BAR_GAP);
        } else {
          // zone.x is the right edge of the first bar; stack leftward
          xl = (zone.x - BAR_W) - drawn * (BAR_W + BAR_GAP);
        }

        const xr   = xl + BAR_W;
        const y1   = zone.y1;
        const y2   = zone.y2;
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
  }
}
