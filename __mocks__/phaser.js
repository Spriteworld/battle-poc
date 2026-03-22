/**
 * Manual Jest mock for the 'phaser' package.
 * Placed at <rootDir>/__mocks__/phaser.js so Jest automatically uses it
 * for all `import Phaser from 'phaser'` statements during tests.
 */

class Container {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x || 0;
    this.y = y || 0;
    this.list = [];
    this.visible = true;
    this.name = '';
  }
  add(item) { this.list.push(item); return this; }
  addAt(item, idx) { this.list.splice(idx, 0, item); return this; }
  setVisible(v) { this.visible = v; return this; }
  destroy() {}
}

class Text {
  constructor(scene, x, y, text) {
    this.scene = scene;
    this.x = x || 0;
    this.y = y || 0;
    this._text = text || '';
    this._color = '';
  }
  setText(t) { this._text = t; return this; }
  setColor(c) { this._color = c; return this; }
  destroy() {}
}

class Graphics {
  fillStyle() { return this; }
  fillRect() { return this; }
  fillGradientStyle() { return this; }
  fillEllipse() { return this; }
  lineStyle() { return this; }
  strokeRect() { return this; }
  lineBetween() { return this; }
}

const Phaser = {
  Game: class {},
  GameObjects: { Container, Graphics, Text },
  Scene: class {},
  Math: {
    Between: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  },
};

module.exports = Phaser;
module.exports.default = Phaser;
