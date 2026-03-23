import { CalcDamage, BasePokemon, TYPES, Moves, STATS, calcTypeEffectiveness } from '@spriteworld/pokemon-data';

const {
  STAT_STAGE_MULTIPLIERS, ACC_STAGE_MULTIPLIERS, STAT_DISPLAY_NAMES,
  MOVE_EFFECTS, MOVE_OVERRIDES, getMovesByGen,
} = Moves;

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

    this.currentHp = config.currentHp || this.currentHp;
    this.moves = this.moves.map(move => new Move(move, config));
    this.id = config.id || uuidv4();

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
      /** Turns remaining while confused; 0 = not confused */
      confusedTurns: 0,
    };

    /**
     * The last move successfully used by this Pokémon — used by Encore.
     * Set after PP is decremented. Not set for Struggle.
     * @type {Move|null}
     */
    this.lastUsedMove = null;
  }

  /**
   * @param {object} target - Defending BattlePokemon
   * @param {Move} move
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation] - Active generation rules
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @return {object}
   */
  attack(target, move, generation, fieldState = null) {
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
        ? Math.min((this.volatileStatus.furyCutterCount ?? 0) + 1, 4)
        : 1;
    } else if (this.volatileStatus?.furyCutterCount) {
      this.volatileStatus.furyCutterCount = 0;
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
      return this.useMetronome(target, move, generation, fieldState);
    }

    if (typeof move === 'undefined' || !(move instanceof Move)) {
      console.warn('BattlePokemon: attack called without a move');
      return;
    }

    move.pp.current = Math.max(0, move.pp.current - 1);
    this.lastUsedMove = move;

    let info;
    if (typeof move.onAttack === 'function') {
      // Custom damage calculation (fixed damage, OHKO, etc.).
      // onAttack is responsible for its own accuracy logic; the standard roll is skipped.
      info = move.onAttack(this, target, generation);
    } else {
      // Standard accuracy check — null means the move always hits (e.g. Swift, Aerial Ace).
      if (move.accuracy !== null) {
        const accStageDelta = Math.max(-6, Math.min(6,
          (this.stages?.ACCURACY ?? 0) - (target.stages?.EVASION ?? 0)
        ));
        const effectiveAcc = move.accuracy * ACC_STAGE_MULTIPLIERS[accStageDelta + 6];
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
      info = CalcDamage.calculate(this, target, move, undefined, generation);
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

    target.takeDamage(info.damage);

    // A missed onAttack (accuracy: 0) returns without applying effects.
    if (info.accuracy === 0) {
      return {
        player: this.getName(),
        enemy: target.getName(),
        move: move.name,
        ...info,
      };
    }

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
   * @param {object} target - Defending BattlePokemon
   * @param {Move} move
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @return {object}
   */
  attackLocked(target, move, generation, fieldState = null) {
    let info;
    if (typeof move.onAttack === 'function') {
      info = move.onAttack(this, target, generation);
    } else {
      if (move.accuracy !== null && !(Math.random() * 100 < move.accuracy)) {
        return {
          player: this.getName(),
          enemy: target.getName(),
          move: move.name,
          accuracy: 0,
          damage: 0,
        };
      }
      info = CalcDamage.calculate(this, target, move, undefined, generation);
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

    target.takeDamage(info.damage);

    if (info.accuracy === 0) {
      return { player: this.getName(), enemy: target.getName(), move: move.name, ...info };
    }

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
   * @return {object}
   */
  attackMultiHit(target, move, generation, hitCount, powers = null, fieldState = null) {
    move.pp.current = Math.max(0, move.pp.current - 1);

    // Single accuracy check for all hits (Gen 3+).
    if (move.accuracy !== null && !(Math.random() * 100 < move.accuracy)) {
      return {
        player: this.getName(),
        enemy: target.getName(),
        move: move.name,
        accuracy: 0,
        damage: 0,
        hits: 0,
      };
    }

    let totalDamage = 0;
    let lastInfo = {};
    let screenReduced = null;
    const hitResults = [];

    for (let i = 0; i < hitCount; i++) {
      const effectiveMove = (powers && powers[i] !== undefined) ? { ...move, power: powers[i] } : move;
      const info = CalcDamage.calculate(this, target, effectiveMove, undefined, generation);
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

      totalDamage += dmg;
      target.takeDamage(dmg);
      hitResults.push({ damage: dmg, critical: info.critical });
      lastInfo = info;
    }

    // Apply effect once after all hits (e.g. Twineedle's 20% poison).
    const effect = (typeof move.onEffect === 'function')
      ? move.onEffect(this, target, { ...lastInfo, damage: totalDamage }) || null
      : null;

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
      effect,
    };
  }

  /**
   * @param {object} target
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @return {object}
   */
  attackRandomMove(target, generation, fieldState = null) {
    if (this.mustStruggle()) {
      return this.struggle(target, generation);
    }
    const available = this.moves.filter(m => m.pp.current > 0);
    const move = available[Math.floor(Math.random() * available.length)];
    return this.attack(target, move, generation, fieldState);
  }

  /**
   * Selects and executes the best move against the target using basic trainer AI.
   *
   * Scoring:
   *   - Immune moves (typeEffectiveness 0) are excluded.
   *   - Damaging moves: score = power × typeEffectiveness.
   *   - Status moves: score = 40 when the target has no status condition, else 0.
   *   - Moves with equal top scores are chosen randomly among themselves.
   *   - 30% chance to pick a random available move instead (Gen 3 AI imperfection).
   *
   * Falls back to Struggle when all moves are at 0 PP.
   *
   * @param {object} target
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @param {{ lightScreen: number, reflect: number }|null} [fieldState] - Defender's active screens
   * @return {object}
   */
  attackWithAI(target, generation, fieldState = null) {
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
      const typeEff = calcTypeEffectiveness(move.type, target.types, generation.typeChart);
      if (typeEff === 0) return { move, score: 0 };
      return { move, score: (move.power || 0) * typeEff };
    });

    const usable = scored.filter(s => s.score > 0);

    // 30% chance to act randomly (Gen 3 AI imperfection)
    if (usable.length === 0 || Math.random() < 0.3) {
      const move = available[Math.floor(Math.random() * available.length)];
      return this.attack(target, move, generation, fieldState);
    }

    usable.sort((a, b) => b.score - a.score);
    const topScore = usable[0].score;
    const topMoves = usable.filter(s => s.score === topScore);
    const chosen = topMoves[Math.floor(Math.random() * topMoves.length)];
    return this.attack(target, chosen.move, generation, fieldState);
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
   * @return {object}
   */
  useMetronome(target, metronomeMove, generation, fieldState = null) {
    metronomeMove.pp.current = Math.max(0, metronomeMove.pp.current - 1);

    const allMoves = getMovesByGen(generation.gen);
    const pool = allMoves.filter(m => !METRONOME_BANNED.has(m.name.toLowerCase()));
    const data  = pool[Math.floor(Math.random() * pool.length)];

    // Build a lightweight move object the attack pipeline understands.
    const calledMove = {
      name:     data.name,
      type:     data.type,
      category: data.category,
      power:    data.power,
      accuracy: data.accuracy ?? null,
      onAttack: MOVE_OVERRIDES[data.name.toLowerCase()] || null,
      onEffect: MOVE_EFFECTS[data.name.toLowerCase()] || null,
    };

    const info = this.attackLocked(target, calledMove, generation, fieldState);
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
