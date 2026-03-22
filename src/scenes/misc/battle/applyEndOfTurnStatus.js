import { STATUS } from '@spriteworld/pokemon-data';

/**
 * Applies end-of-turn status damage to both active Pokémon.
 *
 * Ticks: burn (−1/8 max HP), poison (−1/8 max HP), toxic (escalating toxicCount/16).
 * Skips fainted Pokémon.
 *
 * Designed to be called as `applyEndOfTurnStatus.call(this)` from the battle scene,
 * where `this` has: config, logger, remapActivePokemon.
 */
export default function applyEndOfTurnStatus() {
  const mons = [
    this.config.player.team.getActivePokemon(),
    this.config.enemy.team.getActivePokemon(),
  ];

  for (const mon of mons) {
    if (!mon.isAlive()) continue;

    if (mon.status[STATUS.BURN] > 0) {
      const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
      mon.takeDamage(dmg);
      this.logger.addItem(`${mon.getName()} is hurt by its burn!`);
    }

    if (mon.status[STATUS.POISON] > 0) {
      const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
      mon.takeDamage(dmg);
      this.logger.addItem(`${mon.getName()} is hurt by poison!`);
    }

    if (mon.status[STATUS.TOXIC] > 0) {
      mon.toxicCount = (mon.toxicCount || 0) + 1;
      const dmg = Math.max(1, Math.floor(mon.maxHp * mon.toxicCount / 16));
      mon.takeDamage(dmg);
      this.logger.addItem(`${mon.getName()} is badly hurt by poison!`);
    }
  }

  this.remapActivePokemon();
}
