import BaseItem from './BaseItem.js';
import { STATUS } from '@spriteworld/pokemon-data';

/** Cures a Pokémon of poison or bad poison (Toxic). */
export default class Antidote extends BaseItem {
  constructor() {
    super({
      name: 'Antidote',
      category: 'medicine',
      description: 'Cures a Pokémon of the poisoned or badly poisoned condition.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { success: false, message: `${target.getName()} has fainted.` };
        }

        const isPoisoned = target.status[STATUS.POISON] > 0 || target.status[STATUS.TOXIC] > 0;
        if (!isPoisoned) {
          return { success: false, message: `${target.getName()} is not poisoned.` };
        }

        target.status[STATUS.POISON] = 0;
        target.status[STATUS.TOXIC]  = 0;
        target.toxicCount            = 0;

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Antidote on ${target.getName()}!`,
        };
      },
    });
  }
}
