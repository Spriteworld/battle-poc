import { BattlePokemon, BattleTrainer, BattleTeam } from '@Objects';

export default class BattleStart {
  onEnter() {
    this.logger.addItem('[BattleStart] New Battle!', this.data);
    // validate battle data
    if (!this.data || !this.data.player || !this.data.enemy) {
      console.error('[BattleStart] Invalid battle data');
      return;
    }

    let playerKeys = Object.keys(this.data.player);
    if (playerKeys.length === 0) {
      // console.error('Player doesnt exist...exiting.');
      return;
    }
    let enemyKeys = Object.keys(this.data.enemy);
    if (enemyKeys.length === 0) {
      // console.error('Enemy doesnt exist...exiting.');
      return;
    }

    // initialize battle data
    if (!('config' in this)) {
      this.config = {};
    }

    // setup the field
    this.config.field = this.data.field || {};

    // trainers need setting up as BattleTrainer
    this.config.player = new BattleTrainer(this.data.player);
    this.config.enemy = new BattleTrainer(this.data.enemy);
    console.assert(this.config.player instanceof BattleTrainer, 'Player isnt a BattleTainer');
    console.assert(this.config.player.team instanceof BattleTeam, 'Players Team isnt a BattleTeam');
    console.assert(this.config.enemy.team instanceof BattleTeam, 'Enemy Team isnt a BattleTeam');

    // player always starts first
    this.config.playerTurn = 'player'; 
    this.config.hasData = true;

    this.events.emit('battle-start', this.data);
    this.remapActivePokemon();
    // console.log('[batle-start] Battle started with data:', this.data);
    this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
  }
  
}