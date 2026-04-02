import Phaser from 'phaser';

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
  constructor(scene, x, y, { species, shiny = false, gender = null, isBack = false, size = 96, tilesetBaseUrl }) {
    super(scene, x, y);

    this._size   = size;
    this._isBack = isBack;
    const dir  = isBack ? 'back/' : 'front/';
    const base = String(species);

    this._key  = `pkmn-battle-${isBack ? 'back' : 'front'}-${base}${shiny ? '-shiny' : ''}`;
    this._path = tilesetBaseUrl + 'tileset/pokemon/' + dir + (shiny ? 'shiny/' : '') + base + '.png';
    this._unknownKey  = 'pkmn-battle-unknown';
    this._unknownPath = tilesetBaseUrl + 'tileset/pokemon/front/0.png';

    // Placeholder shown while loading
    this._placeholder = scene.add.graphics();
    this._placeholder.fillStyle(0x000000, 0.12);
    this._placeholder.fillRect(-size / 2, -size / 2, size, size);
    this.add(this._placeholder);

    this._loadAndShow(scene);
    scene.add.existing(this);
  }

  /**
   * Slides the sprite in from off-screen to its current position.
   * Player (back sprite) enters from the left; enemy (front sprite) from the right.
   * @param {Function} [callback] - Called when the tween completes.
   */
  slideIn(callback) {
    const targetX = this.x;
    const startX  = this._isBack ? targetX - 350 : targetX + 250;
    this.setX(startX);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets:  this,
      x:        targetX,
      alpha:    1,
      duration: 400,
      ease:     'Power2.easeOut',
      onComplete: () => callback?.(),
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
    img.setOrigin(0.5, 0.5);
    img.setDisplaySize(this._size, this._size);
    this.add(img);
  }
}
