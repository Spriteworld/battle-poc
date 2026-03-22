import { Moves, TYPES } from '@spriteworld/pokemon-data';
import { MOVE_EFFECTS } from '../../data/moves/effects/index.js';

export default class {
  constructor(config, pokemon) {
    let moveDex = Moves.getMovesByGameId(pokemon.game);
    let move = moveDex.find(m => m.name.toLowerCase() === config.name.toLowerCase());
    if (typeof move === 'undefined') {
      console.warn('Move not found in '+ pokemon.game +' move list:', config.name);
    }

    if (move) {
      Object.assign(this, move);
    }

    this.pp = {
      max: config.pp.max || 0,
      current: config.pp.current || config.pp.max
    };

    /** @type {function|null} Called after damage is applied; returns { message } or null. */
    this.onEffect = MOVE_EFFECTS[this.name?.toLowerCase()] || null;

    console.assert(Object.values(Moves.MOVE_CATEGORIES).includes(this.category), 'Invalid move type: ' + this.category);
    console.assert(Object.values(TYPES).includes(this.type), 'Invalid move type: ' + this.type);
    console.assert(this.name.length, 'Move name is required');
  }

  getName() {
    return this.name;
  }

  debug() {
    console.log('MOVE');
    console.log(this);
  }
}
