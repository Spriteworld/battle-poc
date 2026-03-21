import { CalcDamage, BasePokemon } from '@spriteworld/pokemon-data';
import Move from './Move.js';
import { v4 as uuidv4 } from 'uuid';

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

  attack(target, move) {
    if (typeof move === 'undefined' || !(move instanceof Move)) {
      console.warn('BattlePokemon: attack called without a move');
      return;
    }

    let info = CalcDamage.calculate(this, target, move);
    if (!('damage' in info) || info.damage < 0) {
      info.damage = 0;
    }

    move.pp.current -= 1;

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

  attackRandomMove(target) {
    let move = this.moves[Math.floor(Math.random()*this.moves.length)];
    console.log('BattlePokemon: random pokemon move!', move);
    return this.attack(target, move);
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
