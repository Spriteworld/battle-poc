import BaseItem from './BaseItem.js';

export default class HyperPotion extends BaseItem {
  constructor() {
    super({
      name: 'Hyper Potion',
      category: 'medicine',
      description: 'Restores 200 HP to a Pokémon.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { message: `${target.getName()} has fainted and cannot be healed.` };
        }
        if (target.currentHp === target.maxHp) {
          return { message: `${target.getName()}'s HP is already full.` };
        }

        const restoredHp = Math.min(200, target.maxHp - target.currentHp);
        target.currentHp += restoredHp;

        return {
          player:     action.player.getName(),
          restoredHp,
          currentHp:  target.currentHp,
          message:    `${action.player.getName()} used Hyper Potion, restored ${restoredHp} HP to ${target.getName()}.`,
        };
      },
    });
  }
}
