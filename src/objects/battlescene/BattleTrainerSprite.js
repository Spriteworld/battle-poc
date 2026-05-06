import Phaser from 'phaser';

/**
 * Battle-field trainer sprite. Displays the trainer's battle portrait from
 * `tilesetBaseUrl + 'tileset/characters/trainer/' + name + '.png'`.
 * If the texture was already preloaded into the Phaser cache it is shown
 * immediately; otherwise it is fetched via a native Image element (bypassing
 * the Phaser loader to avoid 304/fetch edge-cases in Phaser 3.90).
 * If the portrait file does not exist, the placeholder is quietly removed.
 * A semi-transparent placeholder is shown while loading.
 *
 * @param {string}  opts.name           - Trainer portrait file name (e.g. 'brock', 'bird_keeper').
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

    this._isEnemy  = isEnemy;
    this._key      = `trainer-battle-${name}`;
    this._path     = `${tilesetBaseUrl}tileset/characters/trainer/${name}.png`;
    this._displayW = displayW;
    this._displayH = displayH;

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
    // Use native Image loading to avoid Phaser loader state issues (calling
    // scene.load.start() from within a loaderror callback is a no-op in Phaser
    // 3.90 because the loader is already completing its current cycle).
    const img = new Image();
    img.onload = () => {
      if (!scene.textures) return;
      scene.textures.addImage(this._key, img);
      this._show(scene, this._key);
    };
    img.onerror = () => {
      // Portrait doesn't exist — silently remove the placeholder.
      if (this._placeholder) {
        this._placeholder.destroy();
        this._placeholder = null;
      }
    };
    img.src = this._path;
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
