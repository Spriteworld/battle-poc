export default class BaseItem {
  constructor({
    name,
    description,
    category = 'other',
    onUse,
  }) {
    this.name        = name;
    this.description = description;
    this.category    = category;
    this.onUse       = onUse;
  }

  getName()     { return this.name; }
  getCategory() { return this.category; }

  use(target) {
    if (typeof this.onUse === 'function') {
      return this.onUse(target);
    } else {
      console.warn(`Item ${this.name} does not have a use function defined.`);
      return null;
    }
  }
}