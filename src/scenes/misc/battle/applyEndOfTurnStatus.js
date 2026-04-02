import { Abilities, STATUS, TYPES } from '@spriteworld/pokemon-data';
import { applyAbilityEOT, isWeatherSuppressed } from './applyAbilityEffects.js';

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
      const sleepImmune = mon.hasAbility?.(Abilities.INSOMNIA) || mon.hasAbility?.(Abilities.VITAL_SPIRIT);
      if (!alreadyHasStatus && !sleepImmune) {
        mon.status[STATUS.SLEEP] = Math.floor(Math.random() * 7) + 1;
        this.logger.addItem(`${mon.getName()} fell asleep!`);
      } else if (sleepImmune) {
        this.logger.addItem(`${mon.getName()}'s ability kept it from falling asleep!`);
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

  // Ingrain — heal 1/16 max HP per turn.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    if (!mon.volatileStatus?.ingrained) continue;
    const healAmt = Math.max(1, Math.floor(mon.maxHp / 16));
    mon.currentHp = Math.min(mon.maxHp, mon.currentHp + healAmt);
    this.logger.addItem(`${mon.getName()} absorbed nutrients with its roots!`);
  }

  // Nightmare — sleeping Pokémon with nightmare lose 1/4 HP per turn.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    if (!mon.volatileStatus?.nightmare) continue;
    if ((mon.status?.[STATUS.SLEEP] ?? 0) === 0) {
      // Woke up — clear nightmare
      mon.volatileStatus.nightmare = false;
      continue;
    }
    const dmg = Math.max(1, Math.floor(mon.maxHp / 4));
    mon.takeDamage(dmg);
    this.logger.addItem(`${mon.getName()} is locked in a nightmare!`);
  }

  // Curse — cursed Pokémon lose 1/4 HP per turn.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    if (!mon.volatileStatus?.cursed) continue;
    const dmg = Math.max(1, Math.floor(mon.maxHp / 4));
    mon.takeDamage(dmg);
    this.logger.addItem(`${mon.getName()} is afflicted by the curse!`);
  }

  // Perish Song — countdown to faint.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    if ((mon.volatileStatus?.perishSongCount ?? 0) <= 0) continue;
    mon.volatileStatus.perishSongCount--;
    this.logger.addItem(`${mon.getName()}'s perish count fell to ${mon.volatileStatus.perishSongCount}!`);
    if (mon.volatileStatus.perishSongCount === 0) {
      mon.takeDamage(mon.currentHp);
      this.logger.addItem(`${mon.getName()} fainted from the perish song!`);
    }
  }

  // Taunt countdown.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    if ((mon.volatileStatus?.taunted ?? 0) <= 0) continue;
    mon.volatileStatus.taunted--;
    if (mon.volatileStatus.taunted === 0) {
      this.logger.addItem(`${mon.getName()}'s taunt wore off!`);
    }
  }

  // Bide — accumulate damage received this turn before _lastReceivedDamage is cleared.
  for (const mon of mons) {
    if (!mon.volatileStatus?.biding) continue;
    const received = mon._lastReceivedDamage?.damage ?? 0;
    mon.volatileStatus.biding.damageAccumulated += received;
  }

  // Uproar EOT — wake any sleeping Pokémon while the field is loud.
  const anyUproaring = mons.some(m => m.volatileStatus?.uproaring);
  if (anyUproaring) {
    for (const mon of mons) {
      if ((mon.status?.[STATUS.SLEEP] ?? 0) > 0) {
        mon.status[STATUS.SLEEP] = 0;
        this.logger.addItem(`${mon.getName()} woke up from the uproar!`);
      }
    }
  }

  // Reset per-round flags for both active Pokémon.
  for (const mon of mons) {
    mon.flinched = false;
    mon._lastReceivedDamage = null;
    if (mon.volatileStatus) {
      mon.volatileStatus.magicCoat = false;
      // Destiny Bond wears off at end of turn.
      mon.volatileStatus.destinyBond = false;
      // Endure lasts only one turn.
      mon.volatileStatus.enduring = false;
      // Protect/Detect: clear the shield; if it was NOT set this turn, break the chain.
      if (mon.volatileStatus.protected) {
        mon.volatileStatus.protected = false;
        // Chain continues — protectCount already set by onEffect.
      } else {
        mon.volatileStatus.protectCount = 0;
      }
    }
  }

  // Trap damage — damaging traps deal 1/16 max HP per turn; no-damage traps (Mean Look etc.) just prevent switching.
  for (const mon of mons) {
    if (!mon.isAlive()) continue;
    const trap = mon.volatileStatus?.trapped;
    if (!trap) continue;
    if (!trap.noDamage) {
      const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
      mon.takeDamage(dmg);
      this.logger.addItem(`${mon.getName()} is hurt by ${trap.sourceName}! (${dmg} damage)`);
    }
    trap.turnsLeft--;
    if (trap.turnsLeft <= 0) {
      mon.volatileStatus.trapped = null;
      this.logger.addItem(`${mon.getName()} was freed from ${trap.sourceName}!`);
    }
  }

  // Weather damage — sandstorm and hail deal 1/16 HP to non-immune types; decrement counter.
  // Hail was introduced in Gen 3; sandstorm EOT damage has applied since Gen 2.
  if (this.weather?.type) {
    const { type } = this.weather;
    const gen = this.generation?.gen ?? 3;
    const hailActive = type === 'hail' && gen >= 3;
    const weatherDamageActive = (type === 'sandstorm' || hailActive) &&
      !isWeatherSuppressed(mons[0], mons[1]);
    if (weatherDamageActive) {
      const immuneSet = type === 'sandstorm' ? SANDSTORM_IMMUNE : HAIL_IMMUNE;
      for (const mon of mons) {
        if (!mon.isAlive()) continue;
        const isImmune = (mon.types ?? []).some(t => immuneSet.has(t)) ||
          (type === 'sandstorm' && mon.hasAbility?.(Abilities.SAND_VEIL));
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

  // Screen countdown — Light Screen, Reflect, Mist, and Safeguard last 5 turns.
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
      if (s.mist > 0) {
        s.mist--;
        if (s.mist === 0) {
          this.logger.addItem(`${label} Mist wore off!`);
        }
      }
      if (s.safeguard > 0) {
        s.safeguard--;
        if (s.safeguard === 0) {
          this.logger.addItem(`${label} Safeguard wore off!`);
        }
      }
    }
  }

  // Future Sight / Doom Desire — countdown to delayed damage; deal damage when counter expires.
  if (this.screens) {
    for (const [side, defenderSide] of [['player', 'enemy'], ['enemy', 'player']]) {
      const fs = this.screens[defenderSide]?.futureSight;
      if (!fs) continue;
      fs.turnsLeft--;
      if (fs.turnsLeft <= 0) {
        const defender = this.config[defenderSide].team.getActivePokemon();
        this.screens[defenderSide].futureSight = null;
        if (defender.isAlive()) {
          defender.takeDamage(fs.damage);
          this.logger.addItem(`${defender.getName()} took the future attack! (${fs.damage} damage)`);
        }
      }
    }
  }

  // EOT ability effects (Speed Boost, Rain Dish, Dry Skin, Shed Skin).
  const [eotPlayer, eotEnemy] = mons;
  for (const [mon, opponent] of [[eotPlayer, eotEnemy], [eotEnemy, eotPlayer]]) {
    applyAbilityEOT(mon, this.weather, this.logger, opponent, this.showAbilityToast?.bind(this));
    if (!mon.isAlive?.()) continue;
    // Clear sleep status for Insomnia/Vital Spirit holders (covers edge cases like Trace).
    if ((mon.status?.[STATUS.SLEEP] ?? 0) > 0 &&
        (mon.hasAbility?.(Abilities.INSOMNIA) || mon.hasAbility?.(Abilities.VITAL_SPIRIT))) {
      mon.status[STATUS.SLEEP] = 0;
      this.logger.addItem(`${mon.getName()}'s ability woke it up!`);
    }
  }

  this.remapActivePokemon();
}
