import BaseItem from './BaseItem.js';

/** Restores one move's PP to its maximum. */
export default class MaxEther extends BaseItem {
  constructor() {
    super({
      name: 'Max Ether',
      category: 'medicine',
      description: 'Fully restores the PP of one of a Pokémon\'s moves.',
      onUse: (target, action) => {
        const moves = target.getMoves ? target.getMoves() : [];
        if (moves.length === 0) {
          return { success: false, message: `${target.getName()} has no moves to restore.` };
        }

        const depleted = moves.filter(m => m.pp.current < m.pp.max);
        if (depleted.length === 0) {
          return { success: false, message: `${target.getName()}'s moves are already at full PP.` };
        }

        // Pick the move with the lowest remaining PP.
        const move = depleted.reduce((lowest, m) =>
          m.pp.current < lowest.pp.current ? m : lowest
        );

        const restoredPp = move.pp.max - move.pp.current;
        move.pp.current  = move.pp.max;

        return {
          player:     action.player.getName(),
          move:       move.name,
          restoredPp,
          message:    `${action.player.getName()} used Max Ether, fully restored ${move.name}'s PP!`,
        };
      },
    });
  }
}
