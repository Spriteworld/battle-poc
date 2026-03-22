import { CalcDamage, BasePokemon, TYPES, Moves, calcTypeEffectiveness } from '@spriteworld/pokemon-data';
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
  }

  /**
   * @param {object} target - Defending BattlePokemon
   * @param {Move} move
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation] - Active generation rules
   * @return {object}
   */
  attack(target, move, generation) {
    if (this.mustStruggle()) {
      return this.struggle(target, generation);
    }

    if (typeof move === 'undefined' || !(move instanceof Move)) {
      console.warn('BattlePokemon: attack called without a move');
      return;
    }

    move.pp.current = Math.max(0, move.pp.current - 1);

    let info;
    if (typeof move.onAttack === 'function') {
      // Custom damage calculation (fixed damage, OHKO, etc.).
      // onAttack is responsible for its own accuracy logic; the standard roll is skipped.
      info = move.onAttack(this, target, generation);
    } else {
      // Standard accuracy check — null means the move always hits (e.g. Swift, Aerial Ace).
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

    const effect = (typeof move.onEffect === 'function')
      ? move.onEffect(this, target, info) || null
      : null;

    return {
      player: this.getName(),
      enemy: target.getName(),
      move: move.name,
      ...info,
      effect,
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
   * @return {object}
   */
  attackLocked(target, move, generation) {
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
   * @return {object}
   */
  attackMultiHit(target, move, generation, hitCount) {
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

    for (let i = 0; i < hitCount; i++) {
      const info = CalcDamage.calculate(this, target, move, undefined, generation);
      const dmg = Math.max(0, info.damage || 0);
      totalDamage += dmg;
      target.takeDamage(dmg);
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
      critical: lastInfo.critical,
      typeEffectiveness: lastInfo.typeEffectiveness,
      effect,
    };
  }

  /**
   * @param {object} target
   * @param {import('@spriteworld/pokemon-data').GenerationConfig} [generation]
   * @return {object}
   */
  attackRandomMove(target, generation) {
    if (this.mustStruggle()) {
      return this.struggle(target, generation);
    }
    const available = this.moves.filter(m => m.pp.current > 0);
    const move = available[Math.floor(Math.random() * available.length)];
    return this.attack(target, move, generation);
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
   * @return {object}
   */
  attackWithAI(target, generation) {
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
      return this.attack(target, move, generation);
    }

    usable.sort((a, b) => b.score - a.score);
    const topScore = usable[0].score;
    const topMoves = usable.filter(s => s.score === topScore);
    const chosen = topMoves[Math.floor(Math.random() * topMoves.length)];
    return this.attack(target, chosen.move, generation);
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
