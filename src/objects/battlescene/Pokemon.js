import { CalcDamage, BasePokemon, TYPES, Moves } from '@spriteworld/pokemon-data';
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
      ivs: config.ivs || {},
      evs: config.evs || {},
      moves: config.moves || [] 
    });

    this.currentHp = config.currentHp || this.currentHp;
    this.moves = this.moves.map(move => new Move(move, config));
    this.id = config.id || uuidv4();
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

    // Accuracy check — null means the move always hits (e.g. Swift, Aerial Ace).
    if (move.accuracy !== null && !(Math.random() * 100 < move.accuracy)) {
      return {
        player: this.getName(),
        enemy: target.getName(),
        move: move.name,
        accuracy: 0,
        damage: 0,
      };
    }

    let info = CalcDamage.calculate(this, target, move, undefined, generation);
    if (!('damage' in info) || info.damage < 0) {
      info.damage = 0;
    }

    let currentHP = target.currentHp;
    target.takeDamage(info.damage);
    // console.log([
    //   'BattlePokemon: ', this.getName(), 'uses',
    //   move.name, 'against', target.getName(),
    //   'for', currentHP, '-', 
    //   info.damage, '= ' + target.currentHp, 'damage',
    // ].join(' '));

    return {
      player: this.getName(),
      enemy: target.getName(),
      move: move.name,
      ...info
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
