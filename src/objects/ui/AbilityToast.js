import Phaser from 'phaser';

const CANVAS_W = 800;

/**
 * An ability-name pill that slides in from the nearest canvas edge, parks flush
 * against it, holds, then slides back out the same way.
 *
 * @param {Phaser.Scene} scene
 * @param {number}       x    - Sprite centre X — determines which edge to anchor to.
 * @param {number}       y    - Sprite centre Y — vertical position of the toast.
 * @param {string}       text - Ability name to display.
 */
export default class AbilityToast extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text) {
    super(scene, 0, y);

    const fromLeft = x < 400;

    const label = scene.add.text(0, 0, text, {
      fontFamily: 'Gen3',
      fontSize:   '12px',
      color:      '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    const padX = 8;
    const padY = 4;
    const w = label.width  + padX * 2;
    const h = label.height + padY * 2;

    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.72);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);

    this.add([bg, label]);
    this.setDepth(20);
    this.setAlpha(0);
    scene.add.existing(this);

    // Park with the pill's outer edge flush against the canvas border.
    const targetX = fromLeft ? w / 2 : CANVAS_W - w / 2;
    const offX    = fromLeft ? -w / 2 : CANVAS_W + w / 2;
    this.setX(offX);

    scene.tweens.add({
      targets:  this,
      x:        targetX,
      alpha:    1,
      duration: 180,
      ease:     'Power2.easeOut',
      onComplete: () => {
        scene.time.delayedCall(1600, () => {
          scene.tweens.add({
            targets:  this,
            x:        offX,
            alpha:    0,
            duration: 180,
            ease:     'Power2.easeIn',
            onComplete: () => this.destroy(),
          });
        });
      },
    });
  }
}
