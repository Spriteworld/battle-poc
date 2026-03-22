import { BattleTeam } from '@Objects';
import { v4 as uuidv4 } from 'uuid';

export default class {
  constructor(config) {
    this.name = null;
    this.team = {};
    this.isWild = false;

    if (config) {
      Object.assign(this, config);

      this.team = new BattleTeam(config.team, config.name);
    }
    
    this.id = uuidv4();
  }

  getName() {
    return this.name || 'Trainer';
  }

  debug() {
    console.log('BATTLETRAINER');
    console.log(this);
  }
}
