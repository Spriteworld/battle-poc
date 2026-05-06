import BaseItem from './BaseItem.js';

/** Revives a fainted Pokémon to full HP. */
export default class MaxRevive extends BaseItem {
  constructor() {
    super({
      name: 'Max Revive',
      category: 'medicine',
      description: 'Revives a fainted Pokémon, fully restoring its HP.',
      onUse: (target, action) => {
        if (target.currentHp > 0) {
          return { success: false, message: `${target.getName()} is not fainted.` };
        }

        target.currentHp = target.maxHp;

        return {
          player:     action.player.getName(),
          restoredHp: target.maxHp,
          currentHp:  target.currentHp,
          message:    `${action.player.getName()} used Max Revive on ${target.getName()}!`,
        };
      },
    });
  }
}
