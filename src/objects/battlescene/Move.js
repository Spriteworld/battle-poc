import { Moves, TYPES } from '@spriteworld/pokemon-data';

export default class {
  constructor(config, pokemon) {
    const moveDex = Moves.getMovesByGameId(pokemon.game);
    const move    = moveDex.find(m => m.name.toLowerCase() === config.name?.toLowerCase());
    if (!move) {
      console.warn('Move not found in ' + pokemon.game + ' move list:', config.name);
    }

    // Copy all data-layer properties (type, category, power, accuracy, gen,
    // onEffect, onAttack, multiHit, multiTurn, priority) onto this instance.
    if (move) Object.assign(this, move);

    // Mutable per-Pokémon PP tracking.
    this.pp = {
      max:     config.pp?.max     ?? move?.pp ?? 0,
      current: config.pp?.current ?? config.pp?.max ?? move?.pp ?? 0,
    };

    console.assert(Object.values(Moves.MOVE_CATEGORIES).includes(this.category), 'Invalid category: ' + this.category);
    console.assert(Object.values(TYPES).includes(this.type), 'Invalid type: ' + this.type);
    console.assert(this.name?.length, 'Move name is required');
  }

  /** @returns {string} The move's display name. */
  getName() {
    return this.name;
  }

  /** Logs the move data to the console for debugging. */
  debug() {
    console.log('MOVE', this);
  }
}
