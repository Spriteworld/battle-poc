import Phaser from 'phaser';

// Battlefield area: 800 wide, 370 tall (UI strip starts at y = 370)
const W = 800;
const H = 370;

// ─── Per-weather particle configs ─────────────────────────────────────────────

const WEATHER = {
  rain: {
    count:        40,
    overlayColor: 0x3060a0,
    overlayAlpha: 0.12,
    init(p) {
      p.x     = Math.random() * W;
      p.y     = Math.random() * H;
      p.vx    = 2.5;
      p.vy    = 14 + Math.random() * 4;
      p.len   = 8 + Math.random() * 8;
      p.alpha = 0.45 + Math.random() * 0.4;
    },
    tick(p) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      if (p.x > W + 10) { p.x = -10; }
    },
    draw(g, p) {
      g.lineStyle(1, 0xaaccff, p.alpha);
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - (p.vx / p.vy) * p.len, p.y - p.len);
      g.strokePath();
    },
  },

  hail: {
    count:        28,
    overlayColor: 0x7090c8,
    overlayAlpha: 0.10,
    init(p) {
      p.x     = Math.random() * W;
      p.y     = Math.random() * H;
      p.vx    = (Math.random() - 0.5) * 1.5;
      p.vy    = 9 + Math.random() * 6;
      p.r     = 2 + Math.random() * 2;
      p.alpha = 0.65 + Math.random() * 0.3;
    },
    tick(p) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > H + p.r) { p.y = -p.r; p.x = Math.random() * W; }
    },
    draw(g, p) {
      g.fillStyle(0xddeeff, p.alpha);
      g.fillCircle(p.x, p.y, p.r);
    },
  },

  sandstorm: {
    count:        55,
    overlayColor: 0xc87820,
    overlayAlpha: 0.18,
    init(p) {
      p.x     = Math.random() * W;
      p.y     = Math.random() * H;
      p.vx    = 5 + Math.random() * 5;
      p.vy    = (Math.random() - 0.5) * 2;
      p.w     = 4 + Math.random() * 10;
      p.h     = 1 + Math.random() * 2;
      p.alpha = 0.25 + Math.random() * 0.5;
    },
    tick(p) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x > W + p.w) { p.x = -p.w; p.y = Math.random() * H; }
    },
    draw(g, p) {
      g.fillStyle(0xd09040, p.alpha);
      g.fillRect(p.x, p.y, p.w, p.h);
    },
  },

  // Sun has no particles — it uses only the overlay + animated rays.
  sun: {
    count:        0,
    overlayColor: 0xffd060,
    overlayAlpha: 0.10,
    init() {},
    tick() {},
    draw() {},
  },
};

// ─── Sun geometry ──────────────────────────────────────────────────────────────

const SUN_CX   = 700;
const SUN_CY   =  40;
const SUN_R    =  18;
const RAY_IN   =  26;
const RAY_OUT  =  72;
const RAY_COUNT = 12;

function drawSun(g, time) {
  const pulse     = 0.30 + Math.sin(time * 0.002) * 0.15;
  const rayExtend = Math.sin(time * 0.0015) * 10;

  g.lineStyle(2, 0xffee88, pulse);
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2;
    g.beginPath();
    g.moveTo(SUN_CX + Math.cos(angle) * RAY_IN,
             SUN_CY + Math.sin(angle) * RAY_IN);
    g.lineTo(SUN_CX + Math.cos(angle) * (RAY_OUT + rayExtend),
             SUN_CY + Math.sin(angle) * (RAY_OUT + rayExtend));
    g.strokePath();
  }
  g.fillStyle(0xffdd44, 0.85);
  g.fillCircle(SUN_CX, SUN_CY, SUN_R);
}

// ─── WeatherDisplay ────────────────────────────────────────────────────────────

/**
 * Animates weather particles over the battlefield.
 *
 * Usage:
 *   const wd = new WeatherDisplay(scene);          // once in create()
 *   wd.setWeather(this.weather);                   // call from remapActivePokemon()
 *   wd.tick(time);                                 // call from scene update()
 *
 * @extends Phaser.GameObjects.Container
 */
export default class WeatherDisplay extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    /** Flat tint / sky-wash layer drawn behind the particles. */
    this._overlay = scene.add.graphics();
    this.add(this._overlay);

    /** Particle layer — redrawn every tick. */
    this._g = scene.add.graphics();
    this.add(this._g);

    this._type      = null;
    this._particles = [];
  }

  /**
   * Sets the active weather type, re-initialising particles when it changes.
   * Call this whenever `this.weather` may have changed (remapActivePokemon).
   * @param {{ type: string|null, turnsLeft: number }|null} weather
   */
  setWeather(weather) {
    const newType = weather?.type ?? null;
    if (newType === this._type) return;
    this._type = newType;
    this._particles = [];
    this._overlay.clear();
    this._g.clear();

    if (!newType || !WEATHER[newType]) return;

    const cfg = WEATHER[newType];

    // Static overlay tint across the whole battlefield.
    this._overlay.fillStyle(cfg.overlayColor, cfg.overlayAlpha);
    this._overlay.fillRect(0, 0, W, H);

    // Sun is all overlay; draw static rays once, tick() will animate them.
    if (newType === 'sun') {
      drawSun(this._overlay, 0);
      return;
    }

    for (let i = 0; i < cfg.count; i++) {
      const p = {};
      cfg.init(p);
      this._particles.push(p);
    }
  }

  /**
   * Advances particle positions and redraws. Call from Scene2.update().
   * @param {number} time - Phaser scene time (ms)
   */
  tick(time) {
    if (!this._type) return;
    const cfg = WEATHER[this._type];

    if (this._type === 'sun') {
      this._overlay.clear();
      this._overlay.fillStyle(cfg.overlayColor, cfg.overlayAlpha);
      this._overlay.fillRect(0, 0, W, H);
      drawSun(this._overlay, time);
      return;
    }

    this._g.clear();
    for (const p of this._particles) {
      cfg.tick(p);
      cfg.draw(this._g, p);
    }
  }
}
