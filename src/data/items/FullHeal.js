import BaseItem from './BaseItem.js';
import { STATUS } from '@spriteworld/pokemon-data';

/** Cures all primary status conditions. */
export default class FullHeal extends BaseItem {
  constructor() {
    super({
      name: 'Full Heal',
      category: 'medicine',
      description: 'Cures any status condition a Pokémon is suffering.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { success: false, message: `${target.getName()} has fainted.` };
        }

        const hasStatus = Object.values(target.status).some(v => v > 0);
        if (!hasStatus) {
          return { success: false, message: `${target.getName()} has no status condition.` };
        }

        for (const key of Object.keys(target.status)) {
          target.status[key] = 0;
        }
        target.toxicCount = 0;

        return {
          player:  action.player.getName(),
          message: `${action.player.getName()} used Full Heal on ${target.getName()}!`,
        };
      },
    });
  }
}
