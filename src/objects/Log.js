import Phaser from 'phaser';

export default class extends Phaser.GameObjects.Container {
  constructor(scene, x, y, children) {
    super(scene, x, y, children);
    this.config = {};
    this.config.scene = scene;
    this.config.children = children || [];
    this.config.x = x;
    this.config.y = y;
    this.log = [];
    this.scene = scene;

    this.shouldUpdate = false;
    this.setLogSize = 28;

    scene.add.existing(this);
  }

  preUpdate() {
    if (this.log.length >= this.setLogSize) {
      //remove the first item if we have more than 5
      this.log.shift();
    }
    if (!this.shouldUpdate) {
      return;
    }
    this.removeAll(true);

    this.log.forEach((log, index) => {
      let item = this.scene.add.text(
        0, (index * 20),
        log.text,
        {
          color: '#ffffff',
          align: 'left',
          font: '14px'
        }
      );
      this.add(item);
    });

    this.shouldUpdate = false;
  }

  addItem(text) {
    this.log.push({ text });
    if (this.log.length >= this.setLogSize) {
      //remove the first item if we have more than 5
      this.log.shift();
    }

    this.shouldUpdate = true;
  }

  clear() {
    this.log = [];
    this.removeAll(true);
  }
}
