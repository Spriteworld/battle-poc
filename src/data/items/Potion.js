import BaseItem from './BaseItem.js';

export default class extends BaseItem {
  constructor() {
    super({
      name: 'Potion',
      description: 'Restores 20 HP to a Pokémon.',
      onUse: (target, action) => {
        if (target.currentHp <= 0) {
          console.warn('Potion: Cannot use on a fainted Pokémon');
          return null;
        }

        let restoredHp = Math.min(20, target.maxHp - target.currentHp);
        target.currentHp += restoredHp;

        let player = action.player.getName();
        let beforeHP = target.currentHp - restoredHp;
        let currentHP = target.currentHp;
        let itemName = this.name;

        console.log(`Potion used on ${target.getName()}. Restored ${restoredHp} HP.(${beforeHP} -> ${currentHP})`);
        return {
          player: player,
          restoredHp: restoredHp,
          currentHp: currentHP,
          message: `${player} used ${itemName}, restored ${restoredHp} HP to ${target.getName()}.`
        };
      }
    });

    return this;
  }
}