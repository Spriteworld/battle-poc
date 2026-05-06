import BaseItem from './BaseItem.js';
import { STATUS } from '@spriteworld/pokemon-data';

/** Cures a Pokémon of a burn. */
export default class BurnHeal extends BaseItem {
  constructor() {
    super({
      name: 'Burn Heal',
      category: 'medicine',
      description: 'Cures a Pokémon of a burn.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { success: false, message: `${target.getName()} has fainted.` };
        }

        if (!target.status[STATUS.BURN]) {
          return { success: false, message: `${target.getName()} is not burned.` };
        }

        target.status[STATUS.BURN] = 0;

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Burn Heal on ${target.getName()}!`,
        };
      },
    });
  }
}
