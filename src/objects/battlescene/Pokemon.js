import { CalcDamage, BasePokemon, TYPES, Moves, STATS, calcTypeEffectiveness, calcStat, Pokedex } from '@spriteworld/pokemon-data';
import { isWeatherSuppressed } from '../../scenes/misc/battle/applyAbilityEffects.js';

const {
  STAT_STAGE_MULTIPLIERS, ACC_STAGE_MULTIPLIERS, STAT_DISPLAY_NAMES,
  getMovesByGen, rollHitCount,
} = Moves;

/**
 * Moves with a naturally elevated critical-hit stage (stage 2 = ~12.5 % in Gen 2–6,
 * or the high-speed threshold in Gen 1).  The move data package stores this only as
 * flavour text, so we maintain the authoritative list here.
 *
 * Storm Throw and Frost Breath (Gen 5) always land critical hits — they are included
 * here so they receive at minimum the elevated stage; a future "always-crit" flag can
 * override this further.
 */
const HIGH_CRIT_MOVES = new Set([
  // Gen 1
  'karate chop', 'razor leaf', 'slash', 'crabhammer', 'razor wind',
  // Gen 2
  'aeroblast', 'cross chop', 'sky attack',
  // Gen 3
  'air cutter', 'blaze kick', 'leaf blade', 'poison tail',
  // Gen 4
  'night slash', 'psycho cut', 'shadow claw', 'spacial rend', 'stone edge',
  // Gen 5
  'drill run', 'frost breath', 'storm throw',
]);

/**
 * Returns the appropriate critical-hit stage for a move and attacker.
 *
 * Stage meanings (fed into CalcDamage as `modifiers.critical`):
 *   1 — base rate (6.25 % in Gen 2–6; speed-based in Gen 1)
 *   2 — high-crit move or Focus Energy active (12.5 % in Gen 2–6; ×8 speed in Gen 1)
 *
 * Gen 1 Focus Energy note: in the original games it was bugged and quartered the
 * crit rate instead of raising it.  We leave the stage at 1 when gen < 2 so the
 * base speed-based formula fires, which is a fair approximation of the buggy result.
 *
 * @param {object} attacker - BattlePokemon
 * @param {object} move     - Move instance
 * @param {object} generation - Active GenerationConfig
 * @return {number} crit stage (1 or 2)
 */
function critStageFor(attacker, move, generation) {
  let stage = 1;
  if (HIGH_CRIT_MOVES.has(move?.name?.toLowerCase())) stage = 2;
  if (attacker.volatileStatus?.focusEnergy && (generation?.gen ?? 3) >= 2) {
    stage = Math.max(stage, 2);
  }
  return stage;
}

// Moves that cannot be called by Metronome (Gen 3).
const METRONOME_BANNED = new Set([
  'counter', 'covet', 'destiny bond', 'detect', 'endure', 'focus punch',
  'follow me', 'helping hand', 'metronome', 'mimic', 'mirror coat',
  'mirror move', 'protect', 'sketch', 'sleep talk', 'snatch', 'struggle',
  'thief', 'transform',
]);
import Move from './Move.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Returns the damage multiplier that weather applies to a move.
 * Rain: Water ×1.5, Fire ×0.5. Sun: Fire ×1.5, Water ×0.5.
 * Sandstorm (Gen 3+): Rock-type defenders take ×0.5 special damage (equivalent to ×1.5 Sp. Def).
 * @param {Move} move
 * @param {{ type: string|null, turnsLeft: number }|null} weather
 * @param {object|null} [target] - Defending BattlePokemon (needed for sandstorm Sp. Def check)
 * @param {object|null} [generation] - Active generation config (needed for move category and gen number)
 * @return {number}
 */
function getWeatherMultiplier(move, weather, target = null, generation = null, attacker = null) {
  if (!weather?.type || !move?.type) return 1;
  // Cloud Nine / Air Lock suppress all weather effects.
  if (isWeatherSuppressed(attacker, target)) return 1;
  const w = weather.type;
  const t = move.type;
  if (w === 'rain') {
    if (t === TYPES.WATER) return 1.5;
    if (t === TYPES.FIRE)  return 0.5;
  }
  if (w === 'sun') {
    if (t === TYPES.FIRE)  return 1.5;
    if (t === TYPES.WATER) return 0.5;
  }
  // Sandstorm Rock Sp. Def boost was introduced in Gen 3.
  if (w === 'sandstorm' && target && generation && (generation.gen ?? 3) >= 3) {
    const cat = generation.getCategory(move);
    if (cat === Moves.MOVE_CATEGORIES.SPECIAL && (target.types ?? []).includes(TYPES.ROCK)) {
      return 0.5; // Rock types receive ×1.5 effective Sp. Def in sandstorm
    }
  }
  return 1;
}

/**
 * Returns true if the weather-based accuracy override makes a move always-hit.
 * Thunder always hits in rain (Gen 2+); Blizzard always hits in hail (Gen 3+).
 * @param {Move} move
 * @param {{ type: string|null }|null} weather
 * @param {object|null} [generation] - Active generation config
 * @return {boolean}
 */
function weatherBypassAccuracy(move, weather, generation = null) {
  if (!weather?.type || !move?.name) return false;
  const gen = generation?.gen ?? 3;
  const name = move.name.toLowerCase();
  return (gen >= 2 && weather.type === 'rain' && name === 'thunder') ||
         (gen >= 3 && weather.type === 'hail' && name === 'blizzard');
}

/**
 * Pseudo-move used when all moves are at 0 PP.
 * Typeless damage (typeEffectiveness forced to 1 in struggle()), ½ max HP recoil.
 */
const STRUGGLE = {
  name: 'Struggle',
  type: TYPES.NORMAL,
  category: Moves.MOVE_CATEGORIES.PHYSICAL,
  power: 50,
};

export default class extends BasePokemon {
  constructor(config, trainerName) {
    super({
      game: config.game,
      pid: config.pid,
      species: config.species,
      originalTrainer: trainerName,
      trainerId: config.trainerId,
      nickname: config.nickname,
      level: config.level,
      nature: config.nature,
      ability: config.ability,
      gender: config.gender,
      ivs: config.ivs || {},
      evs: config.evs || {},
      moves: config.moves || [],
    });

    this.currentHp = config.currentHp != null ? config.currentHp : this.currentHp;
    if (config.exp != null) this.exp = config.exp;
    this.moves = this.moves.map(move => new Move(move, config));
    this.id = config.id || uuidv4();

    /** Type override for Hidden Power (e.g. 'ICE', 'FIRE'). null if not set. */
    this.hiddenPowerType = config.hiddenPowerType ?? null;

    /** The item currently held by this Pokémon. null if not holding anything. */
    this.heldItem = config.heldItem ?? null;
    /** The last item this Pokémon consumed — restored by Recycle. */
    this.consumedItem = null;

    /** Set when locked into a two-turn charge move. `{ move: Move, invulnerable: boolean }` */
    this.lockedMove = null;
    /** True during the charge turn of moves like Fly/Dig/Bounce/Dive. */
    this.invulnerable = false;

    /**
     * Baseline stats at stage 0 — used to recalculate stats after stage changes.
     * Captured once after BasePokemon computes stats.
     */
    this._baseStats = { ...this.stats };

    /**
     * In-battle stat stages, clamped to −6/+6.
     * Combat stages (Attack…Speed) scale this.stats[stat] via STAT_STAGE_MULTIPLIERS.
     * Accuracy / Evasion stages are applied to the accuracy roll in attack().
     */
    this.stages = {
      [STATS.ATTACK]:          0,
      [STATS.DEFENSE]:         0,
      [STATS.SPECIAL_ATTACK]:  0,
      [STATS.SPECIAL_DEFENSE]: 0,
      [STATS.SPEED]:           0,
      ACCURACY: 0,
      EVASION:  0,
    };

    /**
     * Bad-poison (Toxic) escalation counter — increments each end-of-turn tick.
     * Damage dealt = floor(maxHp * toxicCount / 16).
     */
    this.toxicCount = 0;

    /**
     * Set to true when a move with a flinch effect hits this Pokémon while it has
     * not yet acted this turn. Cleared at the end of each round in applyEndOfTurnStatus.
     */
    this.flinched = false;

    /**
     * Volatile status conditions — cleared on switch-out.
     * Unlike primary status, multiple volatile statuses can be active at once.
     */
    this.volatileStatus = {
      leechSeed:   false,
      infatuated:  false,
      magicCoat:   false,
      yawnCounter: 0,
      /** null | { healAmount: number, turnsLeft: number } */
      wishPending: null,
      /** null | { move: Move, turnsLeft: number } */
      encored:     null,
      /** null | { move: Move, turnsLeft: number } */
      disabledMove: null,
      /** 1-based consecutive Fury Cutter use count; resets on miss, different move, or switch-out */
      furyCutterCount: 0,
      /** 1-based consecutive Rollout use count; resets on miss, different move, or switch-out */
      rolloutCount: 0,
      /** Turns remaining while confused; 0 = not confused */
      confusedTurns: 0,
      /** True when the Pokémon has used Ingrain; heals 1/16 max HP per turn */
      ingrained: false,
      /** 0–3 uses of Stockpile stored; consumed by Spit Up and Swallow */
      stockpileCount: 0,
      /** null | { sourceName: string, turnsLeft: number } — trapping move (Wrap, Bind, etc.) */
      trapped: null,
      /** True when the Pokémon is having a nightmare; loses 1/4 HP per turn while asleep */
      nightmare:       false,
      /** True when the Pokémon is cursed by Ghost-type Curse; loses 1/4 HP per turn */
      cursed:          false,
      /** True when Focus Energy is active; raises critical-hit rate */
      focusEnergy:     false,
      /** Perish Song countdown; Pokémon faints when it reaches 0 */
      perishSongCount: 0,
      /** Turns remaining under Taunt; STATUS moves are blocked */
      taunted:         0,
      /** True when Torment is active; prevents using the same move twice in a row */
      tormented:       false,
      /** True when Foresight/Odor Sleuth is active; Ghost-type loses Normal/Fighting immunity */
      identified:      false,
      /** True when Lock-On/Mind Reader is active; next attack auto-hits */
      lockedOn:        false,
      /** True when Charge is active; doubles next Electric-type move's power */
      charged:         false,
      /** True when Snatch is waiting to intercept a beneficial status move */
      snatching:       false,
      /** null | { move: Move, turnsLeft: number } — locked into rampage move (Thrash/Outrage/Petal Dance) */
      rampaging:       null,
      /** null | { hp: number } — substitute proxy; absorbs incoming damage */
      substitute:      null,
      /** True when Protect/Detect is active; blocks all incoming damage/effects this turn */
      protected:       false,
      /** Consecutive Protect/Detect/Endure uses; increments each use, resets when chain broken */
      protectCount:    0,
      /** True when Endure is active; user survives any KO hit with 1 HP this turn */
      enduring:        false,
      /** True when Destiny Bond is active; if user is KO'd, opponent also faints */
      destinyBond:     false,
      /** True when Imprison is active; opponent cannot use shared moves */
      imprisoning:     false,
      /** True when Grudge is active; if user is KO'd, opponent's killing move loses all PP */
      grudge:          false,
      /** null | { turnsLeft: number } — locked into Uproar for 1–2 more turns; prevents sleep */
      uproaring:       null,
      /** null | { damageAccumulated: number, turnsLeft: number } — storing energy with Bide */
      biding:          null,
      /** True when Flash Fire has been triggered; boosts the user's Fire-type moves by 1.5× */
      flashFire:       false,
      /** True on the "loafing" turn for a Pokémon with Truant; alternates each turn */
      truantLoaf:      false,
      /** True after using Defense Curl; doubles Rollout/Ice Ball power (Gen 3) */
      defenseCurled:   false,
      /** True while transformed via Transform; cleared on switch-out */
      transformed:     false,
    };

    // Huge Power / Pure Power: permanently double the Attack stat at construction time.
    const abilityName = this.ability?.name?.toLowerCase() ?? '';
    if (abilityName === 'huge power' || abilityName === 'pure power') {
      this._baseStats[STATS.ATTACK] = Math.floor(this._baseStats[STATS.ATTACK] * 2);
      this.stats[STATS.ATTACK]      = Math.floor(this.stats[STATS.ATTACK] * 2);
    }

    /**
     * The last damage this Pokémon received this turn — used by Counter, Mirror Coat, Metal Burst.
     * Reset to null at end of turn in applyEndOfTurnStatus.
     * @type {{ damage: number, category: string }|null}
     */
    this._lastReceivedDamage = null;

    /**
     * The last move successfully used by this Pokémon — used by Encore.
     * Set after PP is decremented. Not set for Struggle.
     * @type {Move|null}
     */
    this.lastUsedMove = null;

    /**
     * True until the Pokémon takes its first attack action after entering battle.
     * Reset to true on switch-in. Used by Fake Out's first-turn restriction.
     * @type {boolean}
     */
    this.isFirstTurn = true;

    // ── Config overrides for pre-seeded battle state ──────────────────────
    if (config.status)
      Object.assign(this.status, config.status);
    if (config.stages) {
      for (const [stat, value] of Object.entries(config.stages)) {
        if (value !== 0) this.applyStageChange(stat, value);
      }
    }
    if (config.volatileStatus)
      Object.assign(this.volatileStatus, config.volatileStatus);
    if (config.toxicCount  != null) this.toxicCount  = config.toxicCount;
    if (config.isShiny     != null) this.isShiny     = config.isShiny;
    if (config.pokerus     != null) this.pokerus     = config.pokerus;
  }

  /**
   * Updates this Pokémon in-place to the specified evolved form.
   * Recalculates all base stats and battle stats using the new species' data
   * while preserving level, nature, IVs, EVs, moves, and current stage modifiers.
   * Max HP increases are applied to currentHp so the Pokémon gains the difference.
   * @param {number} newNatDexId - nat_dex_id of the evolved form
   */
  evolve(newNatDexId) {
    const newEntry = new Pokedex(this.game).getPokemonById(newNatDexId);
    this.pokemon = newEntry;
    this.species = newEntry.species;
    this.types   = newEntry.types;

    const oldMaxHp = this.maxHp;

    // Recalculate the 6 base stats for the new species.
    const BASE_STAT_KEYS = [
      STATS.HP, STATS.ATTACK, STATS.DEFENSE,
      STATS.SPECIAL_ATTACK, STATS.SPECIAL_DEFENSE, STATS.SPEED,
    ];
    for (const key of BASE_STAT_KEYS) {
      const newBase = calcStat(key, this.level, this.nature, newEntry.base_stats, this.ivs, this.evs);
      this._baseStats[key] = newBase;
      if (key === STATS.HP) {
        this.stats[key] = newBase;
      } else {
        // Re-apply the current stage multiplier so in-battle boosts are preserved.
        const stage = this.stages[key] ?? 0;
        this.stats[key] = stage !== 0
          ? Math.floor(newBase * STAT_STAGE_MULTIPLIERS[stage + 6])
          : newBase;
      }
    }

    // Re-apply Huge Power / Pure Power doubling if the ability is active.
    const abilityName = this.ability?.name?.toLowerCase() ?? '';
    if (abilityName === 'huge power' || abilityName === 'pure power') {
      this._baseStats[STATS.ATTACK] = Math.floor(this._baseStats[STATS.ATTACK] * 2);
      this.stats[STATS.ATTACK]      = Math.floor(this.stats[STATS.ATTACK] * 2);
    }

    this.maxHp     = this._baseStats[STATS.HP];
    this.currentHp = Math.min(this.maxHp, this.currentHp + (this.maxHp - oldMaxHp));
  }

  /**
   * @param {object} target - Defending BattlePokemon
   * @param {Move} move
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation] - Active generation rules
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @param {{ type: string|null, turnsLeft: number }|null} [weather] - Current field weather
   * @return {object}
   */
  attack(target, move, generation, fieldState = null, weather = null) {
    if (this.mustStruggle()) {
      return this.struggle(target, generation);
    }

    // Encore — force the encored move if it still has PP; otherwise clear and continue.
    if (this.volatileStatus.encored) {
      const enc = this.volatileStatus.encored;
      if (enc.move.pp.current === 0) {
        this.volatileStatus.encored = null;
      } else {
        move = enc.move;
        enc.turnsLeft -= 1;
        if (enc.turnsLeft <= 0) {
          this.volatileStatus.encored = null;
        }
      }
    }

    // Fury Cutter — track consecutive uses before lastUsedMove is overwritten.
    if (move?.name?.toLowerCase() === 'fury cutter') {
      const wasConsecutive = this.lastUsedMove?.name?.toLowerCase() === 'fury cutter';
      this.volatileStatus.furyCutterCount = wasConsecutive
        ? Math.min((this.volatileStatus.furyCutterCount ?? 0) + 1, 5)
        : 1;
    } else if (this.volatileStatus?.furyCutterCount) {
      this.volatileStatus.furyCutterCount = 0;
    }

    // Rollout — track consecutive uses before lastUsedMove is overwritten.
    if (move?.name?.toLowerCase() === 'rollout') {
      const wasConsecutive = this.lastUsedMove?.name?.toLowerCase() === 'rollout';
      this.volatileStatus.rolloutCount = wasConsecutive
        ? (this.volatileStatus.rolloutCount ?? 0) + 1
        : 1;
    } else if (this.volatileStatus?.rolloutCount) {
      this.volatileStatus.rolloutCount = 0;
    }

    // Disable — the selected move cannot be used while disabled.
    if (move && this.volatileStatus.disabledMove?.move === move) {
      return {
        player:   this.getName(),
        enemy:    target.getName(),
        move:     move.name,
        accuracy: 0,
        damage:   0,
        disabled: true,
      };
    }

    if (move?.name?.toLowerCase() === 'metronome') {
      this.lastUsedMove = move;
      return this.useMetronome(target, move, generation, fieldState, weather);
    }

    if (typeof move === 'undefined' || move === null || !(move instanceof Move)) {
      console.warn('BattlePokemon: attack called without a valid Move instance', move);
      return {
        player:   this.getName(),
        enemy:    target.getName(),
        move:     move?.name ?? '???',
        accuracy: 0,
        damage:   0,
        failed:   true,
      };
    }

    move.pp.current = Math.max(0, move.pp.current - 1);
    this.lastUsedMove = move;

    let info;
    if (typeof move.onAttack === 'function') {
      // Custom damage calculation (fixed damage, OHKO, etc.).
      // For moves whose onAttack does its own raw accuracy roll (Fury Cutter, Rollout, etc.),
      // we apply the stage-aware accuracy multiplier as a pre-check so that acc/evasion stages
      // are respected. The onAttack's own roll then acts as the final confirmation.
      if (move.accuracy !== null && !weatherBypassAccuracy(move, weather, generation)) {
        const isPhysical = (generation?.getCategory?.(move) ?? move.category) === Moves.MOVE_CATEGORIES.PHYSICAL;
        let accAbilityMult = 1;
        if (typeof this.hasAbility === 'function') {
          if (this.hasAbility('Compound Eyes')) accAbilityMult *= 1.3;
          if (this.hasAbility('Hustle') && isPhysical) accAbilityMult *= 0.8;
        }
        const accStageDelta = Math.max(-6, Math.min(6,
          (this.stages?.ACCURACY ?? 0) - (target.stages?.EVASION ?? 0)
        ));
        const stageMult = ACC_STAGE_MULTIPLIERS[accStageDelta + 6];
        if (stageMult !== 1 || accAbilityMult !== 1) {
          // Only apply a modifier when stages/ability actually deviate from neutral, so that
          // moves which already roll their own accuracy at 100% baseline aren't affected.
          const effectiveAcc = move.accuracy * stageMult * accAbilityMult;
          if (!(Math.random() * 100 < effectiveAcc)) {
            return {
              player: this.getName(),
              enemy:  target.getName(),
              move:   move.name,
              accuracy: 0,
              damage:   0,
            };
          }
        }
      }
      info = move.onAttack(this, target, generation);
      // Defense Curl bonus: if the user used Defense Curl, Rollout and Ice Ball deal double damage.
      const moveLc = move.name?.toLowerCase();
      if ((moveLc === 'rollout' || moveLc === 'ice ball') &&
          this.volatileStatus?.defenseCurled && (info?.damage ?? 0) > 0) {
        info = { ...info, damage: info.damage * 2 };
      }
    } else {
      // Standard accuracy check — null means the move always hits (e.g. Swift, Aerial Ace).
      // Weather can also force a bypass (Thunder in rain, Blizzard in hail).
      const cat = generation?.getCategory?.(move) ?? move.category;
      const isPhysical = cat === Moves.MOVE_CATEGORIES.PHYSICAL;
      const isSpecial  = cat === Moves.MOVE_CATEGORIES.SPECIAL;

      if (move.accuracy !== null && !weatherBypassAccuracy(move, weather, generation)) {
        // Ability-based accuracy modifiers.
        let accAbilityMult = 1;
        if (typeof this.hasAbility === 'function') {
          if (this.hasAbility('Compound Eyes')) accAbilityMult *= 1.3;
          if (this.hasAbility('Hustle') && isPhysical) accAbilityMult *= 0.8;
        }
        const accStageDelta = Math.max(-6, Math.min(6,
          (this.stages?.ACCURACY ?? 0) - (target.stages?.EVASION ?? 0)
        ));
        const effectiveAcc = move.accuracy * ACC_STAGE_MULTIPLIERS[accStageDelta + 6] * accAbilityMult;
        if (!(Math.random() * 100 < effectiveAcc)) {
          return {
            player: this.getName(),
            enemy: target.getName(),
            move: move.name,
            accuracy: 0,
            damage: 0,
          };
        }
      }

      // ── Temporary stat modifications for ability-based damage multipliers ──────
      let origAttack = null, origSpAtk = null, origDef = null;
      if (typeof this.hasAbility === 'function') {
        const hpFrac = this.currentHp / this.maxHp;
        if (isPhysical) {
          let atkMult = 1;
          if (this.hasAbility('Hustle')) atkMult *= 1.5;
          if (this.hasAbility('Guts') && Object.values(this.status ?? {}).some(v => v > 0)) atkMult *= 1.5;
          if (hpFrac <= 1/3) {
            if (this.hasAbility('Blaze')    && move.type === TYPES.FIRE)  atkMult *= 1.5;
            if (this.hasAbility('Torrent')  && move.type === TYPES.WATER) atkMult *= 1.5;
            if (this.hasAbility('Overgrow') && move.type === TYPES.GRASS) atkMult *= 1.5;
            if (this.hasAbility('Swarm')    && move.type === TYPES.BUG)   atkMult *= 1.5;
          }
          if (this.volatileStatus?.flashFire && move.type === TYPES.FIRE) atkMult *= 1.5;
          if (atkMult !== 1) {
            origAttack = this.stats[STATS.ATTACK];
            this.stats[STATS.ATTACK] = Math.floor(origAttack * atkMult);
          }
          // Marvel Scale: defender's Defense × 1.5 when statused.
          if (typeof target.hasAbility === 'function' && target.hasAbility('Marvel Scale') &&
              Object.values(target.status ?? {}).some(v => v > 0)) {
            origDef = target.stats[STATS.DEFENSE];
            target.stats[STATS.DEFENSE] = Math.floor(origDef * 1.5);
          }
        } else if (isSpecial) {
          let spaMult = 1;
          if (hpFrac <= 1/3) {
            if (this.hasAbility('Blaze')    && move.type === TYPES.FIRE)  spaMult *= 1.5;
            if (this.hasAbility('Torrent')  && move.type === TYPES.WATER) spaMult *= 1.5;
            if (this.hasAbility('Overgrow') && move.type === TYPES.GRASS) spaMult *= 1.5;
            if (this.hasAbility('Swarm')    && move.type === TYPES.BUG)   spaMult *= 1.5;
          }
          if (this.volatileStatus?.flashFire && move.type === TYPES.FIRE) spaMult *= 1.5;
          if (spaMult !== 1) {
            origSpAtk = this.stats[STATS.SPECIAL_ATTACK];
            this.stats[STATS.SPECIAL_ATTACK] = Math.floor(origSpAtk * spaMult);
          }
        }
      }

      const weatherMult = getWeatherMultiplier(move, weather, target, generation, this);
      // Pursuit doubles its base power when the opponent is switching out (Gen 3).
      const calcMove = (fieldState?.pursuiting && move?.power != null)
        ? { ...move, power: move.power * 2 }
        : move;
      // Temporarily elevate the crit stage for high-crit moves and Focus Energy.
      const savedCritStage = this.modifiers.critical;
      this.modifiers.critical = critStageFor(this, move, generation);
      info = CalcDamage.calculate(this, target, calcMove, weatherMult !== 1 ? { weather: weatherMult } : undefined, generation);
      this.modifiers.critical = savedCritStage;

      // Restore temporarily modified stats.
      if (origAttack !== null) this.stats[STATS.ATTACK]         = origAttack;
      if (origSpAtk  !== null) this.stats[STATS.SPECIAL_ATTACK] = origSpAtk;
      if (origDef    !== null) target.stats[STATS.DEFENSE]      = origDef;

      if (!('damage' in info) || info.damage < 0) info.damage = 0;

      // Battle Armor / Shell Armor: prevent critical hits.
      if ((info.critical ?? 1) > 1 && typeof target.hasAbility === 'function' &&
          (target.hasAbility('Battle Armor') || target.hasAbility('Shell Armor'))) {
        info.damage   = Math.floor(info.damage / (info.critical ?? 2));
        info.critical = 1;
      }

      // Thick Fat: halve incoming Fire and Ice damage.
      if (info.damage > 0 && typeof target.hasAbility === 'function' && target.hasAbility('Thick Fat') &&
          (move.type === TYPES.FIRE || move.type === TYPES.ICE)) {
        info.damage = Math.floor(info.damage / 2);
      }

      // Wonder Guard: only super-effective moves deal damage.
      if (info.damage > 0 && typeof target.hasAbility === 'function' && target.hasAbility('Wonder Guard')) {
        if ((info.typeEffectiveness ?? 1) <= 1) {
          info.damage = 0;
        }
      }

      // Screen modifier — halves damage; critical hits bypass screens (Gen 3+).
      if (fieldState && info.damage > 0 && (info.critical ?? 1) <= 1) {
        if (isPhysical && fieldState.reflect > 0) {
          info.damage = Math.floor(info.damage / 2);
          info.screenReduced = 'reflect';
        } else if (isSpecial && fieldState.lightScreen > 0) {
          info.damage = Math.floor(info.damage / 2);
          info.screenReduced = 'lightScreen';
        }
      }
    }

    // Substitute — redirect damage to the substitute HP proxy; effects don't pass through.
    if (target.volatileStatus?.substitute && info.damage > 0) {
      const sub = target.volatileStatus.substitute;
      sub.hp -= info.damage;
      if (sub.hp <= 0) {
        target.volatileStatus.substitute = null;
        info.substituteBroke = true;
      }
      info.damage = 0;
    }

    target.takeDamage(info.damage);

    // Endure — if this hit would faint the target, leave at exactly 1 HP.
    if (target.volatileStatus?.enduring && target.currentHp <= 0) {
      target.currentHp = 1;
      info.endured = true;
    }

    if (info.damage > 0) {
      target._lastReceivedDamage = { damage: info.damage, category: generation?.getCategory(move) ?? move.category, type: move.type };
    }
    this.isFirstTurn = false;

    // A missed onAttack (accuracy: 0) returns without applying effects.
    if (info.accuracy === 0) {
      return {
        player: this.getName(),
        enemy: target.getName(),
        move: move.name,
        ...info,
      };
    }

    // Pass weather into info so onEffect handlers (e.g. weatherHeal) can read it.
    if (weather) info.weather = weather;

    // Magic Coat: reflect STATUS moves back to the original attacker.
    let reflected = false;
    if (move.category === Moves.MOVE_CATEGORIES.STATUS && target.volatileStatus?.magicCoat) {
      target.volatileStatus.magicCoat = false;
      reflected = true;
    }
    const effectUser   = reflected ? target : this;
    const effectTarget = reflected ? this   : target;

    const effect = (typeof move.onEffect === 'function')
      ? move.onEffect(effectUser, effectTarget, info) || null
      : null;

    return {
      player: this.getName(),
      enemy: target.getName(),
      move: move.name,
      ...info,
      effect,
      reflected,
    };
  }

  /**
   * Returns true when every move is at 0 PP — the attacker must use Struggle.
   * @return {boolean}
   */
  mustStruggle() {
    return this.moves.length > 0 && this.moves.every(m => m.pp.current === 0);
  }

  /**
   * Executes Struggle: typeless 50-power Physical damage with ½ max HP recoil.
   * Called automatically by attack() / attackRandomMove() when mustStruggle() is true.
   * @param {object} target
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @return {object}
   */
  struggle(target, generation) {
    // Force stab:1 and typeEffectiveness:1 so Struggle is truly typeless.
    const info = CalcDamage.calculate(this, target, STRUGGLE, { stab: 1, typeEffectiveness: 1 }, generation);
    if (!('damage' in info) || info.damage < 0) info.damage = 0;

    target.takeDamage(info.damage);

    const recoil = Math.floor(this.maxHp / 2);
    this.takeDamage(recoil);

    return {
      player: this.getName(),
      enemy: target.getName(),
      move: 'Struggle',
      damage: info.damage,
      critical: info.critical,
      stab: 1,
      typeEffectiveness: 1,
      accuracy: 1,
      recoil,
    };
  }

  /**
   * Executes the strike turn of a two-turn charge move without decrementing PP.
   * PP was already decremented on the charge turn; re-using attack() would subtract it again.
   *
   * @param {object} target - Defending BattlePokémon
   * @param {Move} move
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @param {{ type: string|null, turnsLeft: number }|null} [weather] - Current field weather
   * @return {object}
   */
  attackLocked(target, move, generation, fieldState = null, weather = null) {
    let info;
    if (typeof move.onAttack === 'function') {
      info = move.onAttack(this, target, generation);
    } else {
      if (move.accuracy !== null && !weatherBypassAccuracy(move, weather, generation) && !(Math.random() * 100 < move.accuracy)) {
        return {
          player: this.getName(),
          enemy: target.getName(),
          move: move.name,
          accuracy: 0,
          damage: 0,
        };
      }
      const weatherMult = getWeatherMultiplier(move, weather, target, generation, this);
      const savedCritStageLocked = this.modifiers.critical;
      this.modifiers.critical = critStageFor(this, move, generation);
      info = CalcDamage.calculate(this, target, move, weatherMult !== 1 ? { weather: weatherMult } : undefined, generation);
      this.modifiers.critical = savedCritStageLocked;
      if (!('damage' in info) || info.damage < 0) info.damage = 0;

      // Screen modifier — halves damage; critical hits bypass screens (Gen 3+).
      if (fieldState && info.damage > 0 && (info.critical ?? 1) <= 1) {
        const cat = generation?.getCategory(move);
        if (cat === Moves.MOVE_CATEGORIES.PHYSICAL && fieldState.reflect > 0) {
          info.damage = Math.floor(info.damage / 2);
          info.screenReduced = 'reflect';
        } else if (cat === Moves.MOVE_CATEGORIES.SPECIAL && fieldState.lightScreen > 0) {
          info.damage = Math.floor(info.damage / 2);
          info.screenReduced = 'lightScreen';
        }
      }
    }

    // Substitute — redirect damage to the substitute HP proxy; effects don't pass through.
    if (target.volatileStatus?.substitute && info.damage > 0) {
      const sub = target.volatileStatus.substitute;
      sub.hp -= info.damage;
      if (sub.hp <= 0) {
        target.volatileStatus.substitute = null;
        info.substituteBroke = true;
      }
      info.damage = 0;
    }

    target.takeDamage(info.damage);

    // Endure — if this hit would faint the target, leave at exactly 1 HP.
    if (target.volatileStatus?.enduring && target.currentHp <= 0) {
      target.currentHp = 1;
      info.endured = true;
    }

    if (info.damage > 0) {
      target._lastReceivedDamage = { damage: info.damage, category: generation?.getCategory(move) ?? move.category, type: move.type };
    }
    this.isFirstTurn = false;

    if (info.accuracy === 0) {
      return { player: this.getName(), enemy: target.getName(), move: move.name, ...info };
    }

    if (weather) info.weather = weather;

    const effect = (typeof move.onEffect === 'function')
      ? move.onEffect(this, target, info) || null
      : null;

    return { player: this.getName(), enemy: target.getName(), move: move.name, ...info, effect };
  }

  /**
   * Executes a multi-hit move, rolling damage independently for each hit.
   *
   * Accuracy is checked once (Gen 3+ behaviour). Each hit gets its own crit and
   * damage-variance roll. PP is decremented once regardless of hit count.
   * The move's onEffect (if any) fires once after the final hit.
   *
   * @param {object} target - Defending BattlePokemon
   * @param {Move} move
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {number} hitCount - number of times to hit
   * @param {number[]|null} [powers] - optional per-hit power overrides (e.g. Triple Kick: [10,20,30])
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @param {{ type: string|null, turnsLeft: number }|null} [weather] - Current field weather
   * @return {object}
   */
  attackMultiHit(target, move, generation, hitCount, powers = null, fieldState = null, weather = null) {
    move.pp.current = Math.max(0, move.pp.current - 1);

    // Single accuracy check for all hits (Gen 3+) — mirrors the stage/ability logic in attack().
    if (move.accuracy !== null && !weatherBypassAccuracy(move, weather, generation)) {
      const isPhysical = (generation?.getCategory?.(move) ?? move.category) === Moves.MOVE_CATEGORIES.PHYSICAL;
      let accAbilityMult = 1;
      if (typeof this.hasAbility === 'function') {
        if (this.hasAbility('Compound Eyes')) accAbilityMult *= 1.3;
        if (this.hasAbility('Hustle') && isPhysical) accAbilityMult *= 0.8;
      }
      const accStageDelta = Math.max(-6, Math.min(6,
        (this.stages?.ACCURACY ?? 0) - (target.stages?.EVASION ?? 0)
      ));
      const effectiveAcc = move.accuracy * ACC_STAGE_MULTIPLIERS[accStageDelta + 6] * accAbilityMult;
      if (!(Math.random() * 100 < effectiveAcc)) {
        return {
          player: this.getName(),
          enemy: target.getName(),
          move: move.name,
          accuracy: 0,
          damage: 0,
          hits: 0,
        };
      }
    }

    let totalDamage = 0;
    let lastInfo = {};
    let screenReduced = null;
    let substituteBroke = false;
    const hitResults = [];

    const weatherMult = getWeatherMultiplier(move, weather, target, generation, this);
    const savedCritStageMulti = this.modifiers.critical;
    this.modifiers.critical = critStageFor(this, move, generation);
    for (let i = 0; i < hitCount; i++) {
      const effectiveMove = (powers && powers[i] !== undefined) ? { ...move, power: powers[i] } : move;
      const info = CalcDamage.calculate(this, target, effectiveMove, weatherMult !== 1 ? { weather: weatherMult } : undefined, generation);
      let dmg = Math.max(0, info.damage || 0);

      // Screen modifier per-hit — critical hits bypass screens (Gen 3+).
      if (fieldState && dmg > 0 && (info.critical ?? 1) <= 1) {
        const cat = generation?.getCategory(move);
        if (cat === Moves.MOVE_CATEGORIES.PHYSICAL && fieldState.reflect > 0) {
          dmg = Math.floor(dmg / 2);
          screenReduced = 'reflect';
        } else if (cat === Moves.MOVE_CATEGORIES.SPECIAL && fieldState.lightScreen > 0) {
          dmg = Math.floor(dmg / 2);
          screenReduced = 'lightScreen';
        }
      }

      // Substitute — redirect damage per-hit; stop hitting once the sub breaks.
      if (target.volatileStatus?.substitute && dmg > 0) {
        const sub = target.volatileStatus.substitute;
        sub.hp -= dmg;
        if (sub.hp <= 0) {
          target.volatileStatus.substitute = null;
          substituteBroke = true;
        }
        dmg = 0;
      }

      totalDamage += dmg;
      target.takeDamage(dmg);
      hitResults.push({ damage: dmg, critical: info.critical });
      lastInfo = info;
    }
    this.modifiers.critical = savedCritStageMulti;

    if (totalDamage > 0) {
      target._lastReceivedDamage = { damage: totalDamage, category: generation?.getCategory(move) ?? move.category };
    }
    this.isFirstTurn = false;

    // Apply effect once after all hits (e.g. Twineedle's 20% poison).
    const effect = (typeof move.onEffect === 'function')
      ? move.onEffect(this, target, { ...lastInfo, damage: totalDamage, weather }) || null
      : null;

    // Endure — if the combined hits would faint the target, leave at exactly 1 HP.
    let endured = false;
    if (target.volatileStatus?.enduring && target.currentHp <= 0) {
      target.currentHp = 1;
      endured = true;
    }

    return {
      player: this.getName(),
      enemy: target.getName(),
      move: move.name,
      accuracy: 1,
      damage: totalDamage,
      hits: hitCount,
      hitResults,
      critical: lastInfo.critical,
      typeEffectiveness: lastInfo.typeEffectiveness,
      screenReduced,
      substituteBroke,
      endured,
      effect,
    };
  }

  /**
   * @param {object} target
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @param {{ type: string|null, turnsLeft: number }|null} [weather] - Current field weather
   * @return {object}
   */
  attackRandomMove(target, generation, fieldState = null, weather = null) {
    if (this.mustStruggle()) {
      return this.struggle(target, generation);
    }
    const available = this.moves.filter(m => m.pp.current > 0);
    const move = available[Math.floor(Math.random() * available.length)];
    if (move?.multiHit) {
      const hitCount = rollHitCount(move.multiHit.minHits, move.multiHit.maxHits);
      return this.attackMultiHit(target, move, generation, hitCount, move.multiHit.powers ?? null, fieldState, weather);
    }
    return this.attack(target, move, generation, fieldState, weather);
  }

  /**
   * Selects and executes the best move against the target using scored AI.
   *
   * Scoring:
   *   - Immune moves (typeEffectiveness 0) are excluded.
   *   - Damaging moves: score = power × typeEffectiveness.
   *   - Status moves: score = 40 when the target has no status condition, else 0.
   *   - Moves with equal top scores are chosen randomly among themselves.
   *   - `randomChance` controls the probability of ignoring the score and picking
   *     a random available move instead (Gen 3 AI imperfection, default 30 %).
   *
   * Falls back to Struggle when all moves are at 0 PP.
   *
   * @param {object} target
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @param {{ type: string|null, turnsLeft: number }|null} [weather] - Current field weather
   * @param {number} [randomChance=0.3] - Probability (0–1) of picking a random move.
   * @param {object} [options={}]
   * @param {boolean} [options.useAttackerType=false] - If true, score every move as if its
   *   type were the attacker's primary type instead of the actual move type.  This replicates
   *   the infamous Generation I AI bug where the engine read the wrong type slot.
   * @return {object}
   */
  attackWithAI(target, generation, fieldState = null, weather = null, randomChance = 0.3, options = {}) {
    if (this.mustStruggle()) {
      return this.struggle(target, generation);
    }

    const available = this.moves.filter(m => m.pp.current > 0);
    const targetHasStatus = Object.values(target.status || {}).some(v => v > 0);

    const scored = available.map(move => {
      const category = generation.getCategory(move);
      if (category === Moves.MOVE_CATEGORIES.STATUS) {
        return { move, score: targetHasStatus ? 0 : 40 };
      }
      // Gen 1 AI bug: the engine reads the attacker's primary type slot rather than the
      // move's own type when looking up type effectiveness.
      const scoreType = options.useAttackerType ? (this.types?.[0] ?? move.type) : move.type;
      const typeEff = calcTypeEffectiveness(scoreType, target.types, generation.typeChart);
      if (typeEff === 0) return { move, score: 0 };
      return { move, score: (move.power || 0) * typeEff };
    });

    const usable = scored.filter(s => s.score > 0);

    // Chance to act randomly (Gen 3 AI imperfection — rate controlled by caller)
    if (usable.length === 0 || Math.random() < randomChance) {
      const move = available[Math.floor(Math.random() * available.length)];
      if (move?.multiHit) {
        const hitCount = rollHitCount(move.multiHit.minHits, move.multiHit.maxHits);
        return this.attackMultiHit(target, move, generation, hitCount, move.multiHit.powers ?? null, fieldState, weather);
      }
      return this.attack(target, move, generation, fieldState, weather);
    }

    usable.sort((a, b) => b.score - a.score);
    const topScore = usable[0].score;
    const topMoves = usable.filter(s => s.score === topScore);
    const chosen = topMoves[Math.floor(Math.random() * topMoves.length)];
    if (chosen.move?.multiHit) {
      const hitCount = rollHitCount(chosen.move.multiHit.minHits, chosen.move.multiHit.maxHits);
      return this.attackMultiHit(target, chosen.move, generation, hitCount, chosen.move.multiHit.powers ?? null, fieldState, weather);
    }
    return this.attack(target, chosen.move, generation, fieldState, weather);
  }

  /**
   * Picks a random move from the generation's movelist (excluding banned moves),
   * then executes it via attackLocked (no PP decrement for the called move).
   * Metronome's own PP is decremented here before the call.
   *
   * @param {object} target
   * @param {Move} metronomeMove - the Metronome move instance (for PP tracking)
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} generation
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @param {{ type: string|null, turnsLeft: number }|null} [weather] - Current field weather
   * @return {object}
   */
  useMetronome(target, metronomeMove, generation, fieldState = null, weather = null) {
    metronomeMove.pp.current = Math.max(0, metronomeMove.pp.current - 1);

    const allMoves = getMovesByGen(generation.gen);
    const pool = allMoves.filter(m => !METRONOME_BANNED.has(m.name.toLowerCase()));
    const data  = pool[Math.floor(Math.random() * pool.length)];

    // The data instance already carries onEffect, onAttack, multiHit, multiTurn, priority.
    // Wrap with a mutable pp object so the attack pipeline can decrement it.
    const calledMove = { ...data, pp: { max: data.pp, current: data.pp } };

    const info = this.attackLocked(target, calledMove, generation, fieldState, weather);
    return { ...info, move: `Metronome → ${data.name}` };
  }

  takeDamage(damage) {
    if (this.currentHp <= damage) {
      this.currentHp = 0;
    } else {
      this.currentHp -= damage;
    }
  }

  useItem(item, action) {
    // console.log('BattlePokemon: useItem', item);
    if (typeof item.onUse !== 'function') {
      console.warn('BattlePokemon: useItem called without a valid item.onUse function');
      return;
    }
    return item.onUse(this, action);
  }

  getMoves() {
    return this.moves;
  }

  isAlive() {
    return this.currentHp > 0;
  }

  nameWithHP() {
    return `${this.getName()} (${this.currentHp}/${this.maxHp})`;
  }

  activePokemonMenuMap() {
    let trainerName = this.originalTrainer;
    let nickname = this.getName();
    let hpCurr = this.currentHp;
    let hpMax = this.maxHp;
    let level = this.level;
    return `${trainerName} - ${nickname} Lv${level} (${hpCurr} / ${hpMax})`;
  }

  /**
   * Applies a stat stage change, clamped to ±6.
   * For combat stats (Attack…Speed), updates this.stats[stat] via the multiplier table.
   * For ACCURACY / EVASION, only updates this.stages — the accuracy check uses it directly.
   *
   * @param {string} stat - STATS constant key (e.g. STATS.ATTACK) or 'ACCURACY'/'EVASION'
   * @param {number} delta - Positive = boost, negative = drop
   * @return {{ message: string }}
   */
  applyStageChange(stat, delta) {
    const current = this.stages[stat] ?? 0;
    const next = Math.max(-6, Math.min(6, current + delta));
    const displayName = STAT_DISPLAY_NAMES[stat] || stat;

    if (next === current) {
      const dir = delta > 0 ? 'higher' : 'lower';
      return { message: `${this.getName()}'s ${displayName} won't go any ${dir}!` };
    }

    this.stages[stat] = next;

    // Update live stat for combat stats (acc/evasion don't live in this.stats).
    if (this._baseStats[stat] !== undefined) {
      this.stats[stat] = Math.max(1,
        Math.floor(this._baseStats[stat] * STAT_STAGE_MULTIPLIERS[next + 6])
      );
    }

    const change = next - current;
    const dir = change > 0 ? 'rose' : 'fell';
    const sharpAdj = Math.abs(change) >= 2 ? ' sharply' : '';
    return { message: `${this.getName()}'s ${displayName}${sharpAdj} ${dir}!` };
  }

  hasAbility(abilityName) {
    if (!this.ability || !this.ability.name) {
      return false;
    }
    return this.ability.name.toLowerCase() === abilityName.toLowerCase();
  }

  getBaseStats() {
    return this.pokemon?.base_stats;
  }

  debug() {
    console.log('BATTLEPOKEMON');
    console.log(this);
  }
}
