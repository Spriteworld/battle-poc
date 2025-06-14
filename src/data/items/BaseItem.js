export default class BaseItem {
  constructor({
    name,
    description,
    onUse
  }) {
    this.name = name;
    this.description = description;
    this.onUse = onUse; // Function to call when the item is used
  }

  getName() {
    return this.name;
  }

  use(target) {
    if (typeof this.onUse === 'function') {
      return this.onUse(target);
    } else {
      console.warn(`Item ${this.name} does not have a use function defined.`);
      return null;
    }
  }
}