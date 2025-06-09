import { BattleTeam } from '@Objects';

export default class {
  constructor(config) {
    this.name = null;
    this.team = {};
    
    if (config) {
      Object.assign(this, config);

      this.team = new BattleTeam(config.team, config.name);
    }
  }

  getName() {
    return this.name || 'Trainer';
  }

  debug() {
    console.log('BATTLETRAINER');
    console.log(this);
  }
}
