import { BattleTeam } from '@Objects';
import { v4 as uuidv4 } from 'uuid';
import * as TrainerClass from '../enums/TrainerClass.js';
import WildAI      from './ai/WildAI.js';
import TrainerAI   from './ai/TrainerAI.js';
import GymLeaderAI from './ai/GymLeaderAI.js';
import EliteFourAI from './ai/EliteFourAI.js';
import Gen1AI from './ai/Gen1AI.js';
import Gen2AI from './ai/Gen2AI.js';
import Gen3AI from './ai/Gen3AI.js';
import Gen4AI from './ai/Gen4AI.js';
import Gen5AI from './ai/Gen5AI.js';
import Gen6AI from './ai/Gen6AI.js';
import Gen7AI from './ai/Gen7AI.js';
import Gen8AI from './ai/Gen8AI.js';
import ChampionsAI from './ai/ChampionsAI.js';

/** @type {Record<string, object>} Maps TrainerClass values to AI instances. */
const AI_BY_CLASS = {
  [TrainerClass.WILD]:       new WildAI(),
  [TrainerClass.TRAINER]:    new TrainerAI(),
  [TrainerClass.GYM_LEADER]: new GymLeaderAI(),
  [TrainerClass.ELITE_FOUR]: new EliteFourAI(),
  [TrainerClass.GEN_1]: new Gen1AI(),
  [TrainerClass.GEN_2]: new Gen2AI(),
  [TrainerClass.GEN_3]: new Gen3AI(),
  [TrainerClass.GEN_4]: new Gen4AI(),
  [TrainerClass.GEN_5]: new Gen5AI(),
  [TrainerClass.GEN_6]: new Gen6AI(),
  [TrainerClass.GEN_7]: new Gen7AI(),
  [TrainerClass.GEN_8]: new Gen8AI(),
  [TrainerClass.CHAMPIONS]: new ChampionsAI(),
};

export default class {
  constructor(config) {
    this.name         = null;
    this.team         = {};
    this.isWild       = false;
    this.trainerClass = TrainerClass.TRAINER;

    if (config) {
      Object.assign(this, config);
      this.team = new BattleTeam(config.team, config.name);
    }

    this.ai = AI_BY_CLASS[this.trainerClass] ?? new TrainerAI();
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
