import BaseItem from './BaseItem.js';

/** Fully restores HP and cures all primary status conditions. */
export default class FullRestore extends BaseItem {
  constructor() {
    super({
      name: 'Full Restore',
      category: 'medicine',
      description: 'Fully restores the HP of a Pokémon and heals any status conditions.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { message: `${target.getName()} has fainted and cannot be restored.` };
        }

        const restoredHp = target.maxHp - target.currentHp;
        target.currentHp = target.maxHp;

        // Clear all primary status conditions.
        if (target.status) {
          for (const key of Object.keys(target.status)) {
            target.status[key] = 0;
          }
          target.toxicCount = 0;
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
