import BaseItem from './BaseItem.js';

/** Fully restores HP. Also cures status conditions when the status system is implemented. */
export default class FullRestore extends BaseItem {
  constructor() {
    super({
      name: 'Full Restore',
      description: 'Fully restores the HP of a Pokémon and heals any status conditions.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { message: `${target.getName()} has fainted and cannot be restored.` };
        }

        const restoredHp = target.maxHp - target.currentHp;
        target.currentHp = target.maxHp;

        // Clear status condition when status system is available.
        if (target.status) {
          target.status = null;
        }

        const hpMsg = restoredHp > 0
          ? `, restored ${restoredHp} HP`
          : '';

        return {
          player:     action.player.getName(),
          restoredHp,
          currentHp:  target.currentHp,
          message:    `${action.player.getName()} used Full Restore on ${target.getName()}${hpMsg}!`,
        };
      },
    });
  }
}
