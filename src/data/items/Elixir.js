import BaseItem from './BaseItem.js';

/** Restores 10 PP to all of a Pokémon's moves. */
export default class Elixir extends BaseItem {
  constructor() {
    super({
      name: 'Elixir',
      category: 'medicine',
      description: 'Restores the PP of all of a Pokémon\'s moves by 10.',
      onUse: (target, action) => {
        const moves = target.getMoves ? target.getMoves() : [];
        if (moves.length === 0) {
          return { success: false, message: `${target.getName()} has no moves to restore.` };
        }

        const depleted = moves.filter(m => m.pp.current < m.pp.max);
        if (depleted.length === 0) {
          return { success: false, message: `${target.getName()}'s moves are already at full PP.` };
        }

        for (const move of depleted) {
          move.pp.current = Math.min(move.pp.current + 10, move.pp.max);
        }

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Elixir on ${target.getName()}!`,
        };
      },
    });
  }
}
