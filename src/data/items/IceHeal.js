import BaseItem from './BaseItem.js';
import { STATUS } from '@spriteworld/pokemon-data';

/** Cures a Pokémon of a freeze. */
export default class IceHeal extends BaseItem {
  constructor() {
    super({
      name: 'Ice Heal',
      category: 'medicine',
      description: 'Cures a Pokémon of being frozen.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { success: false, message: `${target.getName()} has fainted.` };
        }

        if (!target.status[STATUS.FROZEN]) {
          return { success: false, message: `${target.getName()} is not frozen.` };
        }

        target.status[STATUS.FROZEN] = 0;

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Ice Heal on ${target.getName()}!`,
        };
      },
    });
  }
}
