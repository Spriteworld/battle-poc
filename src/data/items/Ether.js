import BaseItem from './BaseItem.js';

/** Restores 10 PP to the move with the lowest remaining PP. */
export default class Ether extends BaseItem {
  constructor() {
    super({
      name: 'Ether',
      category: 'medicine',
      description: 'Restores the PP of one move by 10.',
      onUse: (target, action) => {
        const moves = target.getMoves ? target.getMoves() : [];
        if (moves.length === 0) {
          return { message: `${target.getName()} has no moves to restore.` };
        }

        // Pick the move with the lowest remaining PP (that isn't already full).
        const depleted = moves.filter(m => m.pp.current < m.pp.max);
        if (depleted.length === 0) {
          return { message: `${target.getName()}'s moves are already at full PP.` };
        }

        const move = depleted.reduce((lowest, m) =>
          m.pp.current < lowest.pp.current ? m : lowest
        );

        const restoredPp = Math.min(10, move.pp.max - move.pp.current);
        move.pp.current += restoredPp;

        return {
          player:     action.player.getName(),
          move:       move.name,
          restoredPp,
          message:    `${action.player.getName()} used Ether, restored ${restoredPp} PP to ${move.name}!`,
        };
      },
    });
  }
}
