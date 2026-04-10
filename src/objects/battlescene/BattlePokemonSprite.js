import Phaser from 'phaser';

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
    scene.load.once('loaderror', (file) => {
      if (file.key !== this._key) return;
      this._showUnknown(scene);
    });
    scene.load.start();
  }

  _showUnknown(scene) {
    if (scene.textures.exists(this._unknownKey)) {
      this._show(scene, this._unknownKey);
      return;
    }
    scene.load.image(this._unknownKey, this._unknownPath);
    scene.load.once('filecomplete-image-' + this._unknownKey, () => this._show(scene, this._unknownKey));
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
    img.setDisplaySize(this._size, this._size);
    if (this._tint != null) { img.setTint(this._tint); }
    this.add(img);
  }
}
