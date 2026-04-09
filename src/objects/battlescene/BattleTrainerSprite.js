import Phaser from 'phaser';

/**
 * Battle-field trainer sprite. Displays the trainer using one of two sources:
 *  - Battle art  (plain PNG):     loaded with load.image, displayed at a fixed size.
 *  - Overworld sprite (spritesheet): loaded with load.spritesheet, frame 0 scaled up.
 * Battle art takes priority when both are supplied.
 *
 * @param {string}  [opts.battleSpriteKey]      - Cache key for the battle art image.
 * @param {string}  [opts.battleSpriteUrl]      - URL of the battle art PNG.
 * @param {string}  [opts.overworldSpriteKey]   - Cache key for the overworld spritesheet.
 * @param {string}  [opts.overworldSpriteUrl]   - URL of the overworld spritesheet.
 * @param {number}  [opts.overworldScale=4]     - Scale multiplier for the overworld fallback.
 * @param {number}  [opts.battleDisplayW=128]   - Display width for battle art.
 * @param {number}  [opts.battleDisplayH=160]   - Display height for battle art.
 * @param {boolean} [opts.isEnemy=true]         - true = right side; false = left side.
 */
export default class BattleTrainerSprite extends Phaser.GameObjects.Container {
  constructor(scene, x, y, {
    battleSpriteKey   = null,
    battleSpriteUrl   = null,
    overworldSpriteKey = null,
    overworldSpriteUrl = null,
    overworldScale    = 4,
    battleDisplayW    = 128,
    battleDisplayH    = 160,
    isEnemy           = true,
  }) {
    super(scene, x, y);

    this._isEnemy           = isEnemy;
    this._battleKey         = battleSpriteKey;
    this._battleUrl         = battleSpriteUrl;
    this._overworldKey      = overworldSpriteKey;
    this._overworldUrl      = overworldSpriteUrl;
    this._overworldScale    = overworldScale;
    this._battleDisplayW    = battleDisplayW;
    this._battleDisplayH    = battleDisplayH;

    // Placeholder box sized to whichever sprite we expect.
    const pw = battleSpriteUrl ? battleDisplayW : (32 * overworldScale);
    const ph = battleSpriteUrl ? battleDisplayH : (42 * overworldScale);
    this._placeholder = scene.add.graphics();
    this._placeholder.fillStyle(0x000000, 0.08);
    this._placeholder.fillRect(-pw / 2, -ph, pw, ph);
    this.add(this._placeholder);

    this._loadAndShow(scene);
    scene.add.existing(this);
  }

  /**
   * Slides the trainer in from off-screen to the container's current position.
   * @param {Function} [callback]
   */
  slideIn(callback) {
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
    if (this._battleUrl) {
      this._loadBattleSprite(scene);
    } else if (this._overworldUrl) {
      this._loadOverworldSprite(scene);
    }
    // If neither is provided the placeholder stays until the container is dismissed.
  }

  _loadBattleSprite(scene) {
    if (scene.textures.exists(this._battleKey)) {
      this._showBattleSprite(scene);
      return;
    }
    scene.load.image(this._battleKey, this._battleUrl);
    scene.load.once('filecomplete-image-' + this._battleKey, () => this._showBattleSprite(scene));
    scene.load.once('loaderror', (file) => {
      if (file.key !== this._battleKey) return;
      // Fall back to overworld sprite on load failure.
      if (this._overworldUrl) { this._loadOverworldSprite(scene); }
    });
    scene.load.start();
  }

  _loadOverworldSprite(scene) {
    if (scene.textures.exists(this._overworldKey)) {
      this._showOverworldSprite(scene);
      return;
    }
    scene.load.spritesheet(this._overworldKey, this._overworldUrl, {
      frameWidth:  32,
      frameHeight: 42,
    });
    scene.load.once('filecomplete-spritesheet-' + this._overworldKey, () => this._showOverworldSprite(scene));
    scene.load.start();
  }

  _showBattleSprite(scene) {
    if (!this.scene) return;
    this._clearPlaceholder();
    const img = scene.add.image(0, 0, this._battleKey);
    img.setOrigin(0.5, 1);
    img.setDisplaySize(this._battleDisplayW, this._battleDisplayH);
    this.add(img);
  }

  _showOverworldSprite(scene) {
    if (!this.scene) return;
    this._clearPlaceholder();
    const dispW = 32 * this._overworldScale;
    const dispH = 42 * this._overworldScale;
    const img = scene.add.image(0, 0, this._overworldKey, 0);
    img.setOrigin(0.5, 1);
    img.setDisplaySize(dispW, dispH);
    this.add(img);
  }

  _clearPlaceholder() {
    if (this._placeholder) {
      this._placeholder.destroy();
      this._placeholder = null;
    }
  }
}
