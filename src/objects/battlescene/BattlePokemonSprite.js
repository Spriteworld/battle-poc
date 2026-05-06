import Phaser from 'phaser';

/**
 * Module-level cache of per-texture alpha bounding boxes.  Keyed by Phaser
 * texture key so every BattlePokemonSprite that reuses a species only pays
 * the pixel-scan cost once.  Values are `{ minX, minY, maxX, maxY, w, h }`
 * in native-image coords, or `null` when the scan failed (tainted canvas
 * or a missing texture).
 */
const _bboxCache = new Map();

/** Alpha threshold for counting a pixel as "visible" during the bbox scan. */
const _ALPHA_THRESHOLD = 8;

/**
 * Scans the source image's alpha channel and returns the tight bounding box
 * of non-transparent pixels.  Used to offset the sprite so its visible feet
 * land on the container's baseline regardless of empty rows in the PNG frame.
 *
 * @param {Phaser.Scene} scene
 * @param {string}       key
 * @returns {{minX:number,minY:number,maxX:number,maxY:number,w:number,h:number}|null}
 */
function _measureAlphaBbox(scene, key) {
  if (_bboxCache.has(key)) return _bboxCache.get(key);

  const tex = scene.textures.get(key);
  const source = tex?.getSourceImage?.();
  if (!source) { _bboxCache.set(key, null); return null; }

  const w = source.width;
  const h = source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);

  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch (_) {
    // Cross-origin taint or similar — skip bbox, fall back to frame-edge.
    _bboxCache.set(key, null);
    return null;
  }

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > _ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) { _bboxCache.set(key, null); return null; }

  const bbox = { minX, minY, maxX, maxY, w, h };
  _bboxCache.set(key, bbox);
  return bbox;
}

/**
 * Generates polygon points for an N-pointed star centred at the origin.
 * @param {number} outerR - Radius of the outer (tip) vertices.
 * @param {number} innerR - Radius of the inner (notch) vertices.
 * @param {number} n      - Number of points (4 = classic diamond sparkle).
 * @returns {{ x: number, y: number }[]}
 */
function _starPoints(outerR, innerR, n = 4) {
  const pts = [];
  const total = n * 2;
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * i / n) - Math.PI / 2;
    const r     = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return pts;
}

/**
 * Battle-field Pokémon sprite. Lazy-loads the front (enemy) or back (player)
 * sprite from the tileset, showing a semi-transparent placeholder while loading.
 *
 * @param {number}  opts.species        - National Dex ID
 * @param {boolean} [opts.shiny]        - Use shiny variant (default false)
 * @param {string}  [opts.gender]       - 'male' | 'female' (for gender-split sprites)
 * @param {boolean} [opts.isBack]       - true = player back sprite, false = enemy front sprite
 * @param {number}  [opts.size]         - Display size in px (default 96)
 * @param {string}  opts.tilesetBaseUrl - Base URL of the pokemon tileset directory (trailing slash)
 */
export default class BattlePokemonSprite extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { species, shiny = false, gender = null, isBack = false, size = 96, tilesetBaseUrl, tint = null }) {
    super(scene, x, y);

    this._size   = size;
    this._isBack = isBack;
    this._tint   = tint;
    this._shiny  = shiny;
    const dir  = isBack ? 'back/' : 'front/';
    const base = String(species);

    this._key  = `pkmn-battle-${isBack ? 'back' : 'front'}-${base}${shiny ? '-shiny' : ''}`;
    this._path = tilesetBaseUrl + 'tileset/pokemon/' + dir + (shiny ? 'shiny/' : '') + base + '.png';
    
    this._unknownKey  = 'pkmn-battle-unknown';
    this._unknownPath = tilesetBaseUrl + 'tileset/pokemon/front/0.png';

    // Placeholder shown while loading (bottom-anchored to match sprite origin)
    this._placeholder = scene.add.graphics();
    this._placeholder.fillStyle(0x000000, 0.12);
    this._placeholder.fillRect(-size / 2, -size, size, size);
    this.add(this._placeholder);

    this._loadAndShow(scene);
    scene.add.existing(this);
  }

  /**
   * Slides the sprite in from off-screen to its current position while growing
   * from the bottom up (scaleY 0 → 1).
   * Player (back sprite) enters from the left; enemy (front sprite) from the right.
   * @param {Function} [callback] - Called when the tween completes.
   */
  slideIn(callback) {
    const targetX = this.x;
    const startX  = this._isBack ? targetX - 350 : targetX + 250;
    this.setX(startX);
    this.setAlpha(0);
    this.setScale(1, 0);
    this.scene.tweens.add({
      targets:  this,
      x:        targetX,
      alpha:    1,
      scaleY:   1,
      duration: 400,
      ease:     'Power2.easeOut',
      onComplete: () => {
        if (this._shiny) this._playShinySparkle();
        callback?.();
      },
    });
  }

  /**
   * Plays a Gen 3-style star sparkle around the sprite for shiny Pokémon.
   * Stars pop in fast then hold briefly before fading, so they're clearly visible.
   */
  _playShinySparkle() {
    if (!this.scene) return;
    const s = this._size;
    const positions = [
      { x: -s * 0.38, y: -s * 0.72 },
      { x:  s * 0.42, y: -s * 0.88 },
      { x: -s * 0.22, y: -s * 0.42 },
      { x:  s * 0.30, y: -s * 0.55 },
      { x:  s * 0.05, y: -s * 1.00 },
    ];
    positions.forEach(({ x, y }, i) => {
      const g = this.scene.add.graphics();
      // White outer 4-pointed star, yellow inner 4-pointed star on top.
      g.fillStyle(0xffffff, 1);
      g.fillPoints(_starPoints(13, 4, 4), true);
      g.fillStyle(0xffe040, 1);
      g.fillPoints(_starPoints(9, 3, 4), true);
      g.setPosition(x, y);
      g.setScale(0);
      this.add(g);

      this.scene.time.delayedCall(i * 80, () => {
        if (!this.scene || !g.scene) return;
        this.scene.tweens.add({
          targets:  g,
          scaleX:   1,
          scaleY:   1,
          duration: 120,
          ease:     'Back.easeOut',
          onComplete: () => {
            if (!this.scene || !g.scene) return;
            this.scene.tweens.add({
              targets:  g,
              alpha:    0,
              scaleX:   1.3,
              scaleY:   1.3,
              delay:    120,
              duration: 350,
              ease:     'Power2.easeIn',
              onComplete: () => g.destroy(),
            });
          },
        });
      });
    });
  }

  _loadAndShow(scene) {
    if (scene.textures.exists(this._key)) {
      this._show(scene, this._key);
      return;
    }

    scene.load.image(this._key, this._path);
    scene.load.once('filecomplete-image-' + this._key, () => this._show(scene, this._key));
    const onError = (file) => {
      if (file.key !== this._key) return;
      scene.load.off('loaderror', onError);
      this._showUnknown(scene);
    };
    scene.load.on('loaderror', onError);
    scene.load.start();
  }

  _showUnknown(scene) {
    if (scene.textures.exists(this._unknownKey)) {
      this._show(scene, this._unknownKey);
      return;
    }
    scene.load.image(this._unknownKey, this._unknownPath);
    scene.load.once('filecomplete-image-' + this._unknownKey, () => this._show(scene, this._unknownKey));
    const onError = (file) => {
      if (file.key !== this._unknownKey) return;
      scene.load.off('loaderror', onError);
    };
    scene.load.on('loaderror', onError);
    scene.load.start();
  }

  _show(scene, key) {
    if (!this.scene) return;
    if (this._placeholder) {
      this._placeholder.destroy();
      this._placeholder = null;
    }
    const img = scene.add.image(0, 0, key);
    img.setOrigin(0.5, 1);
    if (this._tint != null) { img.setTint(this._tint); }
    this.add(img);

    // Scale by the *frame* dimensions so Pokémon keep their natural size
    // relationships — a tiny sprite like Pichu stays smaller than a giant
    // like Snorlax even though they share the same `_size` target.
    const scale = this._size / Math.max(img.width, img.height);
    img.setScale(scale);

    // Alpha-bbox trim is only used for *positioning*: shift the image so the
    // bbox bottom lands at y=0 (feet on the baseline) and the bbox centre
    // sits at x=0 (content centred, not frame centred).  No effect on size.
    const bbox = _measureAlphaBbox(scene, key);
    if (bbox) {
      const bottomPad = (bbox.h - 1 - bbox.maxY) * scale;
      const contentCx = (bbox.minX + bbox.maxX) / 2;
      const hOffset   = (bbox.w / 2 - contentCx) * scale;
      img.setPosition(hOffset, bottomPad);
    }
  }
}
