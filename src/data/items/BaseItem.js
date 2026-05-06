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

  /** @returns {string} The item's display name. */
  getName() {
    return this.name;
  }

  /** @returns {string} The item's category. */
  getCategory() {
    return this.category;
  }

  /**
   * Applies the item's effect to the target.
   * @param {object} target - The BattlePokemon to apply the item to.
   * @param {object} [action] - The battle action that triggered this use.
   * @returns {object|null} Result object, or null if no onUse function is defined.
   */
  use(target) {
    if (typeof this.onUse === 'function') {
      return this.onUse(target);
    } else {
      console.warn(`Item ${this.name} does not have a use function defined.`);
      return null;
    }
  }
}