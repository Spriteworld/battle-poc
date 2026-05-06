import BaseItem from './BaseItem.js';

export default class SuperPotion extends BaseItem {
  constructor() {
    super({
      name: 'Super Potion',
      category: 'medicine',
      description: 'Restores 50 HP to a Pokémon.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { message: `${target.getName()} has fainted and cannot be healed.` };
        }
        if (target.currentHp === target.maxHp) {
          return { message: `${target.getName()}'s HP is already full.` };
        }

        const restoredHp = Math.min(50, target.maxHp - target.currentHp);
        target.currentHp += restoredHp;

        return {
          player:     action.player.getName(),
          restoredHp,
          currentHp:  target.currentHp,
          message:    `${action.player.getName()} used Super Potion, restored ${restoredHp} HP to ${target.getName()}.`,
        };
      },
    });
  }
}
