import BaseItem from './BaseItem.js';

/** Fully restores the PP of all of a Pokémon's moves. */
export default class MaxElixir extends BaseItem {
  constructor() {
    super({
      name: 'Max Elixir',
      category: 'medicine',
      description: 'Fully restores the PP of all of a Pokémon\'s moves.',
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
          move.pp.current = move.pp.max;
        }

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Max Elixir on ${target.getName()}!`,
        };
      },
    });
  }
}
