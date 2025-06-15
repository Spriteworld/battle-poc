import Phaser from 'phaser';
import { MenuItem } from '@Objects';

export default class extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);

    this.config = {};
    this.config.scene = scene;
    this.config.menuItems = [];
    this.config.menuItemIndex = 0;
    this.config.x = x;
    this.config.y = y;
    this.config.selected = false;

    if (!this.name) {
      this.name = (Math.random() + 1).toString(36).substring(7);
    }

    scene.add.existing(this);

    return this;
  }

  getName() {
    return this.name;
  }

  addMenuItem(item) {
    let menuItem = new MenuItem(this.config.scene, 0, this.config.menuItems.length*20, item);
    this.config.menuItems.push(menuItem);
    this.add(menuItem);
    return this;
  }

  moveSelectionUp() {
    this.config.menuItems[this.config.menuItemIndex]?.deselect();
    this.config.menuItemIndex--;
    if (this.config.menuItemIndex < 0) {
      this.config.menuItemIndex = this.config.menuItems.length - 1;
    }
    this.config.menuItems[this.config.menuItemIndex]?.select();
  }

  moveSelectionDown() {
    this.config.menuItems[this.config.menuItemIndex]?.deselect();
    this.config.menuItemIndex++;
    if (this.config.menuItemIndex >= this.config.menuItems.length) {
      this.config.menuItemIndex = 0;
    }
    this.config.menuItems[this.config.menuItemIndex]?.select();
  }

  select(index) {
    if(!index) { index = 0; }
    this.config.menuItems[this.config.menuItemIndex]?.deselect();
    this.config.menuItemIndex = index;
    this.config.menuItems[this.config.menuItemIndex]?.select();
    this.config.selected = true;
  }

  deselect() {
    this.config.menuItems[this.config.menuItemIndex]?.deselect();
    this.config.menuItemIndex = 0;
    this.config.selected = false;
  }

  confirm() {
    let eventName = [this.name, 'select-option', this.config.menuItemIndex].join('-').toLowerCase();
    console.log(`[Menu] ${this.name} option selected:`, this.config.menuItemIndex);
    // console.log('[Menu] triggering event', eventName);
    this.config.scene.events.emit(
      eventName,
      this.config.menuItemIndex
    );
  }

  clear() {
    for(var i = 0; i < this.config.menuItems.length; i++) {
      this.config.menuItems[i].destroy();
    }
    this.config.menuItems.length = 0;
    this.config.menuItemIndex = 0;
  }

  // recreate the menu items
  remap(units) {
    this.clear();
    for(var i = 0; i < units.length; i++) {
      this.addMenuItem(units[i]);
    }
    this.config.menuItemIndex = 0;
  }

}
