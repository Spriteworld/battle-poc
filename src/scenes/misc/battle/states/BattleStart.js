import { BattleTrainer, WildTrainer, BattleTeam } from '@Objects';
import { GENERATIONS, GEN_3 } from '@spriteworld/pokemon-data';
import { applySwitchInAbilities } from '../applyAbilityEffects.js';

export default class BattleStart {
  onEnter() {
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

    // Resolve active generation. Callers can pass e.g. { generation: 'GEN_3' } or a GenerationConfig object.
    if (this.data.generation && typeof this.data.generation === 'object') {
      this.generation = this.data.generation;
    } else if (this.data.generation && GENERATIONS[this.data.generation]) {
      this.generation = GENERATIONS[this.data.generation];
    } else {
      this.generation = GEN_3;
    }

    if (this.generation.gen !== 3) {
      this.logger.addItem(`Battle rules: ${this.generation.name}`);
    }

    // Initialise field weather from battle data (e.g. { field: { weather: 'rain' } }).
    // Weather was introduced in Gen 2; Hail was introduced in Gen 3.
    const startWeather = this.data.field?.weather ?? null;
    const gen = this.generation.gen ?? 3;
    const weatherAllowed = startWeather && gen >= 2 && (startWeather !== 'hail' || gen >= 3);
    if (weatherAllowed) {
      this.weather = { type: startWeather, turnsLeft: Infinity };
      const WEATHER_START = {
        rain:      'A heavy rain began to fall!',
        sun:       'The sunlight turned harsh!',
        sandstorm: 'A sandstorm brewed!',
        hail:      'It started to hail!',
      };
      this.logger.addItem(WEATHER_START[startWeather] ?? 'The weather changed!');
    }

    this.events.emit('battle-start', this.data);

    // Fire switch-in abilities for both leads (Intimidate, weather setters, Trace, etc.).
    // Player's lead triggers first, then enemy's — matching Gen 3 speed-order convention
    // at battle start where both sides send out simultaneously.
    const playerLead = this.config.player.team.getActivePokemon();
    const enemyLead  = this.config.enemy.team.getActivePokemon();
    applySwitchInAbilities(playerLead, enemyLead, this.weather, this.logger, this.generation);
    applySwitchInAbilities(enemyLead,  playerLead, this.weather, this.logger, this.generation);

    this.remapActivePokemon();
    this.logger.flush(() => this.stateMachine.setState(this.stateDef.PLAYER_ACTION));
  }
  
}