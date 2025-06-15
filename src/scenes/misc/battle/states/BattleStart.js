import { BattleTrainer, WildTrainer, BattleTeam } from '@Objects';

export default class BattleStart {
  onEnter() {
    this.logger.addItem('[BattleStart] New Battle!', this.data);
    // validate battle data
    if (!this.data || !this.data.player || !this.data.enemy) {
      console.error('[BattleStart] Invalid battle data');
      return;
    }

    if (Object.keys(this.data.player).length === 0) {
      // console.error('Player doesnt exist...exiting.');
      return;
    }
    if (Object.keys(this.data.enemy).length === 0) {
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
    this.config.enemy = this.data.enemy.isTrainer 
      ? new BattleTrainer(this.data.enemy) 
      : new WildTrainer(this.data.enemy)
    ;

    console.assert(this.config.player instanceof BattleTrainer, 'Player isnt a BattleTainer');
    console.assert(
      this.config.enemy instanceof BattleTrainer || this.config.enemy instanceof WildTrainer, 
      'Enemy isnt a BattleTainer / WildTrainer'
    );
    console.assert(this.config.player.team instanceof BattleTeam, 'Players Team isnt a BattleTeam');
    console.assert(this.config.enemy.team instanceof BattleTeam, 'Enemy Team isnt a BattleTeam');

    this.config.hasData = true;
    this.escapeAttempts = 0;

    this.events.emit('battle-start', this.data);
    this.remapActivePokemon();
    // console.log('[batle-start] Battle started with data:', this.data);
    this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
  }
  
}