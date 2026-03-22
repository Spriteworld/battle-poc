import BaseItem from './BaseItem.js';

export default class MaxPotion extends BaseItem {
  constructor() {
    super({
      name: 'Max Potion',
      description: 'Fully restores the HP of a Pokémon.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          return { message: `${target.getName()} has fainted and cannot be healed.` };
        }
        if (target.currentHp === target.maxHp) {
          return { message: `${target.getName()}'s HP is already full.` };
        }

        const restoredHp = target.maxHp - target.currentHp;
        target.currentHp = target.maxHp;

        return {
          player:     action.player.getName(),
          restoredHp,
          currentHp:  target.currentHp,
          message:    `${action.player.getName()} used Max Potion, fully restored ${target.getName()}'s HP!`,
        };
      },
    });
  }
}
