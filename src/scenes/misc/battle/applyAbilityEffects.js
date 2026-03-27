import { Abilities, STATUS, TYPES, STATS } from '@spriteworld/pokemon-data';

// ─── Switch-in abilities ───────────────────────────────────────────────────────

/**
 * Applies ability effects that trigger when a Pokémon enters battle.
 * Handles: Intimidate, weather setters (Drizzle/Drought/Sand Stream/Snow Warning), Trace.
 *
 * @param {object} incoming   - The Pokémon just sent out.
 * @param {object} opponent   - The currently active opposing Pokémon.
 * @param {object} weather    - Mutable weather object { type, turnsLeft }.
 * @param {object} logger     - Logger instance with addItem().
 * @param {object} generation - Generation config.
 */
export function applySwitchInAbilities(incoming, opponent, weather, logger, generation) {
  if (!incoming) return;

  // Intimidate — lower opponent's Attack by 1 stage.
  if (incoming.hasAbility(Abilities.INTIMIDATE) && opponent?.isAlive?.()) {
    const blocked =
      opponent.hasAbility(Abilities.CLEAR_BODY)   ||
      opponent.hasAbility(Abilities.WHITE_SMOKE)  ||
      opponent.hasAbility(Abilities.HYPER_CUTTER);
    if (blocked) {
      logger.addItem(`${incoming.getName()}'s Intimidate had no effect on ${opponent.getName()}!`);
    } else {
      if (typeof opponent.applyStageChange === 'function') {
        opponent.applyStageChange(STATS.ATTACK, -1);
      }
      logger.addItem(`${incoming.getName()}'s Intimidate lowered ${opponent.getName()}'s Attack!`);
    }
  }

  // Weather setters.
  if (weather) {
    const gen = generation?.gen ?? 3;
    const setWeather = (type, message) => {
      if (weather.type !== type) {
        weather.type      = type;
        weather.turnsLeft = 5;
        logger.addItem(message);
      }
    };
    if (gen >= 2) {
      if (incoming.hasAbility(Abilities.DRIZZLE))     setWeather('rain',      'It started to rain!');
      if (incoming.hasAbility(Abilities.DROUGHT))     setWeather('sun',       'The sunlight turned harsh!');
      if (incoming.hasAbility(Abilities.SAND_STREAM)) setWeather('sandstorm', 'A sandstorm brewed!');
    }
    if (gen >= 3) {
      if (incoming.hasAbility(Abilities.SNOW_WARNING)) setWeather('hail', 'It started to hail!');
    }
  }

  // Trace — copy the opponent's ability (one hop only; can't copy Trace itself).
  if (incoming.hasAbility(Abilities.TRACE) && opponent?.ability?.name) {
    const oppAbilityName = opponent.ability.name.toLowerCase();
    if (oppAbilityName !== 'trace') {
      incoming.ability = { ...opponent.ability };
      logger.addItem(`${incoming.getName()} traced ${opponent.getName()}'s ${opponent.ability.name}!`);
      // Only trigger weather-setter side effects of the traced ability to avoid double-Intimidate etc.
      if (weather) {
        const gen = generation?.gen ?? 3;
        const setWeather = (type, message) => {
          if (weather.type !== type) { weather.type = type; weather.turnsLeft = 5; logger.addItem(message); }
        };
        if (gen >= 2) {
          if (incoming.hasAbility(Abilities.DRIZZLE))     setWeather('rain',      'It started to rain!');
          if (incoming.hasAbility(Abilities.DROUGHT))     setWeather('sun',       'The sunlight turned harsh!');
          if (incoming.hasAbility(Abilities.SAND_STREAM)) setWeather('sandstorm', 'A sandstorm brewed!');
        }
        if (gen >= 3 && incoming.hasAbility(Abilities.SNOW_WARNING)) setWeather('hail', 'It started to hail!');
      }
    }
  }
}

// ─── Type / ability immunities ────────────────────────────────────────────────

/**
 * Checks whether the defender's ability makes it immune to the incoming move.
 * If immune, may apply a side effect (healing, Flash Fire activation, etc.) and
 * returns a message string.  Returns null if no immunity applies.
 *
 * @param {object} defender  - BattlePokemon receiving the move.
 * @param {object} move      - The move being used.
 * @param {object} [weather] - Current weather (used for Dry Skin context, optional).
 * @return {string|null}     - Immunity message, or null if no immunity.
 */
export function checkAbilityImmunity(defender, move, weather) {
  if (!move?.type) return null;

  if (defender.hasAbility(Abilities.LEVITATE) && move.type === TYPES.GROUND) {
    return `${defender.getName()} is floating above the ground!`;
  }

  if (defender.hasAbility(Abilities.FLASH_FIRE) && move.type === TYPES.FIRE) {
    if (!defender.volatileStatus.flashFire) {
      defender.volatileStatus.flashFire = true;
      return `${defender.getName()}'s Flash Fire was activated!`;
    }
    return `${defender.getName()}'s Flash Fire took the hit!`;
  }

  if (defender.hasAbility(Abilities.VOLT_ABSORB) && move.type === TYPES.ELECTRIC) {
    const heal = Math.max(1, Math.floor(defender.maxHp / 4));
    defender.currentHp = Math.min(defender.maxHp, defender.currentHp + heal);
    return `${defender.getName()} restored HP using Volt Absorb!`;
  }

  if (defender.hasAbility(Abilities.WATER_ABSORB) && move.type === TYPES.WATER) {
    const heal = Math.max(1, Math.floor(defender.maxHp / 4));
    defender.currentHp = Math.min(defender.maxHp, defender.currentHp + heal);
    return `${defender.getName()} restored HP using Water Absorb!`;
  }

  if (defender.hasAbility(Abilities.DRY_SKIN) && move.type === TYPES.WATER) {
    const heal = Math.max(1, Math.floor(defender.maxHp / 4));
    defender.currentHp = Math.min(defender.maxHp, defender.currentHp + heal);
    return `${defender.getName()}'s Dry Skin absorbed the water!`;
  }

  return null;
}

// ─── Contact ability effects (on the defender) ────────────────────────────────

/** Returns true if the move makes physical contact (simple heuristic: physical category). */
function isContact(move, generation) {
  const cat = generation?.getCategory?.(move) ?? move.category;
  return cat === 'physical';
}

/**
 * Applies the defender's contact-triggered ability after a successful hit.
 * Handles: Static, Flame Body, Poison Point, Rough Skin, Effect Spore, Cute Charm.
 *
 * @param {object} attacker   - BattlePokemon that attacked.
 * @param {object} defender   - BattlePokemon that was hit.
 * @param {object} move       - The move used.
 * @param {object} info       - Attack result (needs info.damage > 0).
 * @param {object} logger     - Logger.
 * @param {object} generation - Generation config.
 */
export function applyContactAbilityEffects(attacker, defender, move, info, logger, generation) {
  if (!info || info.damage <= 0) return;
  if (!isContact(move, generation)) return;

  function noStatus(mon) {
    return !Object.values(mon.status ?? {}).some(v => v > 0);
  }

  // Static: 30% chance to paralyze attacker.
  if (defender.hasAbility(Abilities.STATIC)) {
    if (Math.random() < 0.3 && noStatus(attacker) && !attacker.hasAbility(Abilities.LIMBER)) {
      attacker.status[STATUS.PARALYZE] = 1;
      logger.addItem(`${attacker.getName()} was paralyzed by Static!`);
    }
  }

  // Flame Body: 30% chance to burn attacker.
  if (defender.hasAbility(Abilities.FLAME_BODY)) {
    if (Math.random() < 0.3 && noStatus(attacker) && !attacker.hasAbility(Abilities.WATER_VEIL) &&
        !(attacker.types ?? []).includes(TYPES.FIRE)) {
      attacker.status[STATUS.BURN] = 1;
      if (attacker.modifiers) attacker.modifiers.burn = true;
      logger.addItem(`${attacker.getName()} was burned by Flame Body!`);
    }
  }

  // Poison Point: 30% chance to poison attacker.
  if (defender.hasAbility(Abilities.POISON_POINT)) {
    const immuneToPoison = attacker.hasAbility(Abilities.IMMUNITY) ||
      (attacker.types ?? []).some(t => t === TYPES.POISON || t === TYPES.STEEL);
    if (Math.random() < 0.3 && noStatus(attacker) && !immuneToPoison) {
      attacker.status[STATUS.POISON] = 1;
      logger.addItem(`${attacker.getName()} was poisoned by Poison Point!`);
    }
  }

  // Rough Skin: deal 1/8 max HP damage to attacker.
  if (defender.hasAbility(Abilities.ROUGH_SKIN)) {
    const dmg = Math.max(1, Math.floor(attacker.maxHp / 8));
    attacker.takeDamage(dmg);
    logger.addItem(`${attacker.getName()} was hurt by Rough Skin! (${dmg} damage)`);
  }

  // Effect Spore: 10% sleep, 10% poison, 10% paralyze.
  if (defender.hasAbility(Abilities.EFFECT_SPORE) && noStatus(attacker)) {
    const roll = Math.random();
    if (roll < 0.1 && !attacker.hasAbility(Abilities.INSOMNIA) && !attacker.hasAbility(Abilities.VITAL_SPIRIT)) {
      attacker.status[STATUS.SLEEP] = Math.floor(Math.random() * 7) + 1;
      logger.addItem(`${attacker.getName()} fell asleep due to Effect Spore!`);
    } else if (roll < 0.2) {
      const immuneToPoison = attacker.hasAbility(Abilities.IMMUNITY) ||
        (attacker.types ?? []).some(t => t === TYPES.POISON || t === TYPES.STEEL);
      if (!immuneToPoison) {
        attacker.status[STATUS.POISON] = 1;
        logger.addItem(`${attacker.getName()} was poisoned by Effect Spore!`);
      }
    } else if (roll < 0.3 && !attacker.hasAbility(Abilities.LIMBER)) {
      attacker.status[STATUS.PARALYZE] = 1;
      logger.addItem(`${attacker.getName()} was paralyzed by Effect Spore!`);
    }
  }

  // Cute Charm: 30% chance to infatuate attacker (regardless of gender for simplicity).
  if (defender.hasAbility(Abilities.CUTE_CHARM)) {
    if (Math.random() < 0.3 && !attacker.volatileStatus?.infatuated && !attacker.hasAbility(Abilities.OBLIVIOUS)) {
      if (attacker.volatileStatus) attacker.volatileStatus.infatuated = true;
      logger.addItem(`${attacker.getName()} fell in love due to Cute Charm!`);
    }
  }
}

/**
 * Applies Color Change ability — changes the defender's type to the move's type on a hit.
 */
export function applyColorChange(defender, move, logger) {
  if (!defender.hasAbility(Abilities.COLOR_CHANGE)) return;
  if (!move?.type) return;
  if (defender.types?.length === 1 && defender.types[0] === move.type) return;
  defender.types = [move.type];
  logger.addItem(`${defender.getName()} changed its type to ${move.type}!`);
}

// ─── End-of-turn abilities ─────────────────────────────────────────────────────

/**
 * Applies end-of-turn ability effects for one Pokémon.
 * Handles: Speed Boost, Rain Dish, Dry Skin, Shed Skin.
 *
 * @param {object} mon     - BattlePokemon.
 * @param {object} weather - Current weather { type, turnsLeft }.
 * @param {object} logger  - Logger.
 */
export function applyAbilityEOT(mon, weather, logger) {
  if (!mon.isAlive?.()) return;
  if (typeof mon.hasAbility !== 'function') return;

  // Speed Boost: raise Speed by 1 each turn (cap at +6).
  if (mon.hasAbility(Abilities.SPEED_BOOST)) {
    if ((mon.stages?.[STATS.SPEED] ?? 0) < 6 && typeof mon.applyStageChange === 'function') {
      mon.applyStageChange(STATS.SPEED, 1);
      logger.addItem(`${mon.getName()}'s Speed Boost raised its Speed!`);
    }
  }

  // Rain Dish: heal 1/16 HP in rain.
  if (mon.hasAbility(Abilities.RAIN_DISH) && weather?.type === 'rain') {
    const heal = Math.max(1, Math.floor(mon.maxHp / 16));
    mon.currentHp = Math.min(mon.maxHp, mon.currentHp + heal);
    logger.addItem(`${mon.getName()}'s Rain Dish restored its HP!`);
  }

  // Dry Skin: heal 1/8 in rain, take 1/8 damage in sun.
  if (mon.hasAbility(Abilities.DRY_SKIN)) {
    if (weather?.type === 'rain') {
      const heal = Math.max(1, Math.floor(mon.maxHp / 8));
      mon.currentHp = Math.min(mon.maxHp, mon.currentHp + heal);
      logger.addItem(`${mon.getName()}'s Dry Skin absorbed moisture!`);
    } else if (weather?.type === 'sun') {
      const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
      mon.takeDamage(dmg);
      logger.addItem(`${mon.getName()}'s Dry Skin was dried out!`);
    }
  }

  // Shed Skin: 30% chance to cure any primary status condition.
  if (mon.hasAbility(Abilities.SHED_SKIN)) {
    const hasStatus = Object.values(mon.status ?? {}).some(v => v > 0);
    if (hasStatus && Math.random() < 0.3) {
      for (const key of Object.keys(mon.status)) mon.status[key] = 0;
      if (mon.modifiers) mon.modifiers.burn = false;
      mon.toxicCount = 0;
      logger.addItem(`${mon.getName()} shed its skin and cured its status!`);
    }
  }
}

// ─── Speed modifier ───────────────────────────────────────────────────────────

/**
 * Returns the speed multiplier from the Pokémon's ability and current weather.
 * Used in BeforeAction to compute effective turn order speed.
 */
export function getAbilitySpeedModifier(mon, weather) {
  if (mon.hasAbility(Abilities.SWIFT_SWIM)  && weather?.type === 'rain')      return 2;
  if (mon.hasAbility(Abilities.CHLOROPHYLL) && weather?.type === 'sun')       return 2;
  return 1;
}
