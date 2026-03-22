import * as ActionTypes from '../enums/ActionTypes.js';

export default class {
  constructor({
    type,
    player,
    target,
    config = {},
  }) {
    this.type = type;     // Type of action (e.g., 'attack', 'useItem', etc.)
    this.player = player; // Player who initiated the action
    this.target = target; // Target of the action
    this.config = config; // Additional configuration for the action

    if (!Object.values(ActionTypes).includes(type)) {
      throw new Error(`Invalid action type: ${type}. Must be one of ${Object.values(ActionTypes).join(', ')}.`);
    }
    if (!this.player || !this.target) {
      throw new Error('Action must have both player and target defined.');
    }

    if (this.type === ActionTypes.ATTACK && typeof this.config.move === 'undefined') {
      throw new Error('Action '+ this.type +' must have a move defined in config.');
    }

    if (this.type === ActionTypes.USE_ITEM && typeof this.config.item === 'undefined') {
      throw new Error('Action '+ this.type +' must have an item defined in config.');
    }
  }
}