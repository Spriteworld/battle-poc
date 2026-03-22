import Phaser from 'phaser';

/**
 * A single selectable text entry inside a Menu.
 *
 * When selected a ► cursor is prepended and the text turns yellow.
 * Stores the original label so the cursor can be added/removed cleanly.
 *
 * @extends Phaser.GameObjects.Text
 */
export default class extends Phaser.GameObjects.Text {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} label
   */
  constructor(scene, x, y, label) {
    super(scene, x, y, ' ' + label, {
      color: '#f0ece4',
      align: 'left',
      fontSize: '16px',
      fontFamily: 'monospace',
      stroke: '#181818',
      strokeThickness: 1,
    });
    this._label = label;
    scene.add.existing(this);
  }

  select() {
    this.setColor('#f8e030');
    this.setText('►' + this._label);
  }

  deselect() {
    this.setColor('#f0ece4');
    this.setText(' ' + this._label);
  }

  /** @return {string} The original label without cursor prefix. */
  text() {
    return this._label;
  }
}
