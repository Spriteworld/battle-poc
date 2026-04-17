import Phaser from 'phaser';

/**
 * Battle-field trainer sprite. Lazy-loads the trainer's battle image from
 * `tilesetBaseUrl + 'tileset/characters/trainer/' + name + '.png'`. If that
 * file does not exist, falls back to the overworld sprite at
 * `tilesetBaseUrl + 'tileset/characters/sprites/' + name + '.png'`.
 * A semi-transparent placeholder is shown while loading.
 *
 * @param {string}  opts.name           - Trainer file name (e.g. 'brock', 'bird_keeper').
 * @param {string}  opts.tilesetBaseUrl - Base URL of the tileset directory (trailing slash).
 * @param {number}  [opts.displayW=128] - Display width in px.
 * @param {number}  [opts.displayH=160] - Display height in px.
 * @param {boolean} [opts.isEnemy=true] - true = right side; false = left side.
 */
export default class BattleTrainerSprite extends Phaser.GameObjects.Container {
  constructor(scene, x, y, {
    name,
    tilesetBaseUrl,
    displayW = 128,
    displayH = 160,
    isEnemy  = true,
  }) {
    super(scene, x, y);

    this._isEnemy      = isEnemy;
    this._key          = `trainer-battle-${name}`;
    this._path         = `${tilesetBaseUrl}tileset/characters/trainer/${name}.png`;
    this._fallbackKey  = `trainer-overworld-${name}`;
    this._fallbackPath = `${tilesetBaseUrl}tileset/characters/sprites/${name}.png`;
    this._displayW     = displayW;
    this._displayH     = displayH;

    // Placeholder shown while loading (bottom-anchored to match sprite origin).
    this._placeholder = scene.add.graphics();
    this._placeholder.fillStyle(0x000000, 0.08);
    this._placeholder.fillRect(-displayW / 2, -displayH, displayW, displayH);
    this.add(this._placeholder);

    scene.add.existing(this);
  }

  /**
   * Starts loading the trainer image then slides the sprite in from off-screen.
   * Loading is deferred to here so no network request fires until the sprite is needed.
   * @param {Function} [callback]
   */
  slideIn(callback) {
    this._loadAndShow(this.scene);

    const targetX = this.x;
    const startX  = this._isEnemy ? targetX + 300 : targetX - 300;
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

  /**
   * Slides the trainer off-screen and destroys the container.
   * @param {Function} [callback]
   */
  slideOut(callback) {
    const endX = this._isEnemy ? this.x + 300 : this.x - 300;
    this.scene.tweens.add({
      targets:  this,
      x:        endX,
      alpha:    0,
      duration: 300,
      ease:     'Power2.easeIn',
      onComplete: () => {
        this.destroy();
        callback?.();
      },
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
      this._loadFallback(scene);
    });
    scene.load.start();
  }

  _loadFallback(scene) {
    if (scene.textures.exists(this._fallbackKey)) {
      this._show(scene, this._fallbackKey);
      return;
    }
    scene.load.image(this._fallbackKey, this._fallbackPath);
    scene.load.once('filecomplete-image-' + this._fallbackKey, () => this._show(scene, this._fallbackKey));
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
    img.setDisplaySize(this._displayW, this._displayH);
    this.add(img);
  }
}
