import Trainer from './Trainer.js';
import * as TrainerClass from '../enums/TrainerClass.js';

export default class extends Trainer {
  constructor(config) {
    const team = Array.isArray(config.team) ? config.team.slice(0, 1) : config.team;
    super({
      ...config,
      name: 'Wild',
      isWild: true,
      trainerClass: TrainerClass.WILD,
      team,
    });
  }

  getName() {
    const active = this.team.getActivePokemon();
    return active ? active.getName() : this.name;
  }
}
