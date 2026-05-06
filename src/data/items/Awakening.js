import BaseItem from './BaseItem.js';
import { STATUS } from '@spriteworld/pokemon-data';

/** Wakes a sleeping Pokémon. */
export default class Awakening extends BaseItem {
  constructor() {
    super({
      name: 'Awakening',
      category: 'medicine',
      description: 'Wakes up a Pokémon that is asleep.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { success: false, message: `${target.getName()} has fainted.` };
        }

        if (!target.status[STATUS.SLEEP]) {
          return { success: false, message: `${target.getName()} is not asleep.` };
        }

        target.status[STATUS.SLEEP] = 0;

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Awakening on ${target.getName()}!`,
        };
      },
    });
  }
}
