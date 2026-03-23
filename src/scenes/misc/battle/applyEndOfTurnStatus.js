import { STATUS, TYPES } from '@spriteworld/pokemon-data';

const WEATHER_END = {
  rain:      'The rain stopped.',
  sun:       'The harsh sunlight faded.',
  sandstorm: 'The sandstorm subsided.',
  hail:      'The hail stopped.',
};

const SANDSTORM_IMMUNE = new Set([TYPES.ROCK, TYPES.GROUND, TYPES.STEEL]);
const HAIL_IMMUNE      = new Set([TYPES.ICE]);

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

  // Leech Seed — seeded Pokémon lose 1/8 max HP; opponent gains that amount.
  const [playerMon, enemyMon] = mons;
  for (const [seeded, healer] of [[playerMon, enemyMon], [enemyMon, playerMon]]) {
    if (!seeded.isAlive()) continue;
    if (!seeded.volatileStatus?.leechSeed) continue;
    const dmg = Math.max(1, Math.floor(seeded.maxHp / 8));
    seeded.takeDamage(dmg);
    if (healer.isAlive()) {
      healer.currentHp = Math.min(healer.maxHp, healer.currentHp + dmg);
    }
    this.logger.addItem(`${seeded.getName()}'s health is sapped by Leech Seed!`);
  }

  // Yawn countdown — apply sleep when counter expires.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    if ((mon.volatileStatus?.yawnCounter ?? 0) <= 0) continue;
    mon.volatileStatus.yawnCounter--;
    if (mon.volatileStatus.yawnCounter === 0) {
      const alreadyHasStatus = Object.values(mon.status).some(v => v > 0);
      if (!alreadyHasStatus) {
        mon.status[STATUS.SLEEP] = Math.floor(Math.random() * 7) + 1;
        this.logger.addItem(`${mon.getName()} fell asleep!`);
      }
    }
  }

  // Wish countdown — heal the active Pokémon in the slot when the wish resolves.
  for (const side of [this.config.player, this.config.enemy]) {
    const activeNow = side.team.getActivePokemon();
    const wisher = side.team.pokemon.find(m => m.volatileStatus?.wishPending?.turnsLeft > 0);
    if (!wisher) continue;
    wisher.volatileStatus.wishPending.turnsLeft--;
    if (wisher.volatileStatus.wishPending.turnsLeft === 0) {
      const healAmt = wisher.volatileStatus.wishPending.healAmount;
      wisher.volatileStatus.wishPending = null;
      if (activeNow.isAlive()) {
        activeNow.currentHp = Math.min(activeNow.maxHp, activeNow.currentHp + healAmt);
        this.logger.addItem(`${activeNow.getName()}'s wish came true!`);
      }
    }
  }

  // Disable countdown — clear when the timer expires.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    const dis = mon.volatileStatus?.disabledMove;
    if (!dis) continue;
    dis.turnsLeft--;
    if (dis.turnsLeft <= 0) {
      const moveName = dis.move.name;
      mon.volatileStatus.disabledMove = null;
      this.logger.addItem(`${mon.getName()}'s ${moveName} is no longer disabled!`);
    }
  }

  // Reset per-round flags for both active Pokémon.
  for (const mon of mons) {
    mon.flinched = false;
    if (mon.volatileStatus) mon.volatileStatus.magicCoat = false;
  }

  // Trap damage — seeded Pokémon lose 1/16 max HP per turn; count down to release.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    const trap = mon.volatileStatus?.trapped;
    if (!trap) continue;
    const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
    mon.takeDamage(dmg);
    this.logger.addItem(`${mon.getName()} is hurt by ${trap.sourceName}! (${dmg} damage)`);
    trap.turnsLeft--;
    if (trap.turnsLeft <= 0) {
      mon.volatileStatus.trapped = null;
      this.logger.addItem(`${mon.getName()} was freed from ${trap.sourceName}!`);
    }
  }

  // Weather damage — sandstorm and hail deal 1/16 HP to non-immune types; decrement counter.
  if (this.weather?.type) {
    const { type } = this.weather;
    if (type === 'sandstorm' || type === 'hail') {
      const immuneSet = type === 'sandstorm' ? SANDSTORM_IMMUNE : HAIL_IMMUNE;
      for (const mon of mons) {
        if (!mon.isAlive()) continue;
        const isImmune = (mon.types ?? []).some(t => immuneSet.has(t));
        if (!isImmune) {
          const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
          mon.takeDamage(dmg);
          this.logger.addItem(`${mon.getName()} is buffeted by the ${type}!`);
        }
      }
    }

    this.weather.turnsLeft--;
    if (this.weather.turnsLeft <= 0) {
      this.logger.addItem(WEATHER_END[type] ?? 'The weather cleared.');
      this.weather.type     = null;
      this.weather.turnsLeft = 0;
    }
  }

  // Screen countdown — Light Screen and Reflect last 5 turns.
  if (this.screens) {
    for (const side of ['player', 'enemy']) {
      const label = side === 'player' ? 'Your' : "The enemy's";
      const s = this.screens[side];
      if (s.lightScreen > 0) {
        s.lightScreen--;
        if (s.lightScreen === 0) {
          this.logger.addItem(`${label} Light Screen wore off!`);
        }
      }
      if (s.reflect > 0) {
        s.reflect--;
        if (s.reflect === 0) {
          this.logger.addItem(`${label} Reflect wore off!`);
        }
      }
    }
  }

  this.remapActivePokemon();
}
