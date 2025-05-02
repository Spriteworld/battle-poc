import { STATS, CalcDamage } from '@spriteworld/pokemon-data';

export default class {
 
  constructor(config, trainer) {
    this.pid = 0;
    this.originalTrainer = null;
    this.nickname = null;
    this.species = 0;
    this.level = 1;
    this.exp = 0;
    this.isShiny = false;
    this.currentHp = 0;
    this.moves = [];
    this.ivs = {
      [STATS.HP]: 0,
      [STATS.ATTACK]: 0,
      [STATS.DEFENSE]: 0,
      [STATS.SPECIAL_ATTACK]: 0,
      [STATS.SPECIAL_DEFENSE]: 0,
      [STATS.SPEED]: 0,
    };
    this.evs = {
      [STATS.HP]: 0,
      [STATS.ATTACK]: 0,
      [STATS.DEFENSE]: 0,
      [STATS.SPECIAL_ATTACK]: 0,
      [STATS.SPECIAL_DEFENSE]: 0,
      [STATS.SPEED]: 0,
    };

    if (config) {
      Object.assign(this, config);
    }
    this.trainer = trainer;
  }

  getName() {
    return this.nickname || this.pokemon.species;
  }

  attack(target, move) {
    let info = CalcDamage.calculate(this, target, move.move);
    console.log('info', info);
    if (!('damage' in info) || info.damage < 0) {
      info.damage = 0;
    }

    move.pp.current = move.pp.current-1;

    console.log('BattlePokemon: '
      + this.getName() + ' uses '
      + move.move.name + ' against '
      + target.getName() +' for '
      + info.damage + ' damage'
    );
    target.takeDamage(info.damage);

    return {
      player: this.getName(),
      enemy: target.getName(),
      move: move.move.name,
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

  getAttacks() {
    return this.moves.map(move => {
      return {
        name: move.name,
        damage: move.damage,
        pp: move.pp
      }
    });
  }

  debug() {
    console.log('BATTLEPOKEMON');
    console.log(this);
  }
}
