import BaseItem from './BaseItem.js';

/** Revives a fainted Pokémon to half its max HP. */
export default class Revive extends BaseItem {
  constructor() {
    super({
      name: 'Revive',
      description: 'Revives a fainted Pokémon to half its max HP.',
      onUse: (target, action) => {
        if (target.currentHp > 0) {
          return { message: `${target.getName()} is not fainted.` };
        }

        const restoredHp = Math.floor(target.maxHp / 2);
        target.currentHp = restoredHp;

        return {
          player:     action.player.getName(),
          restoredHp,
          currentHp:  target.currentHp,
          message:    `${action.player.getName()} used Revive on ${target.getName()}!`,
        };
      },
    });
  }
}
