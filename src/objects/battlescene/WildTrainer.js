import Trainer from './Trainer.js';

export default class extends Trainer {
  constructor(config) {
    config.name = 'Wild';
    config.isWild = true;
    super(config);
  }

  getName() {
    return this.team.getActivePokemon().getName();
  }
}