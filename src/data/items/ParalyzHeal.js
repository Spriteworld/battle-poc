import BaseItem from './BaseItem.js';
import { STATUS } from '@spriteworld/pokemon-data';

/** Cures a Pokémon of paralysis. */
export default class ParalyzHeal extends BaseItem {
  constructor() {
    super({
      name: 'Paralyz Heal',
      category: 'medicine',
      description: 'Cures a Pokémon of paralysis.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { success: false, message: `${target.getName()} has fainted.` };
        }

        if (!target.status[STATUS.PARALYZE]) {
          return { success: false, message: `${target.getName()} is not paralyzed.` };
        }

        target.status[STATUS.PARALYZE] = 0;

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Paralyz Heal on ${target.getName()}!`,
        };
      },
    });
  }
}
