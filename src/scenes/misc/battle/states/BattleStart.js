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

    // Always reset field state at the start of a fresh battle.
    this.weather = { type: null, turnsLeft: 0 };
    this.screens = {
      player: { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
    };

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

    // Set up background, weather, platforms, and status boxes — but no sprites yet.
    this.ActivePokemonMenu.remap({
      playerPokemon: this.config.player.team.getActivePokemon(),
      enemyPokemon:  this.config.enemy.team.getActivePokemon(),
      enemyTrainer:  this.config.enemy,
    });
    this.FieldScreens.update(this.screens);
    this.WeatherDisplay.setWeather(this.weather);
    this._updateBackground(this.weather?.type ?? null);
    this._updatePlatforms(this.weather?.type ?? null);

    const playerLead = this.config.player.team.getActivePokemon();
    const enemyLead  = this.config.enemy.team.getActivePokemon();
    const toast      = this.showAbilityToast?.bind(this);
    const isWild     = this.config.enemy instanceof WildTrainer;

    // Flush any weather / generation messages queued during setup.
    this.logger.flush(() => {

      const spawnBattle = () => {
        // 1. Enemy Pokémon enters.
        this._spawnEnemySpriteAnimated(() => {
          const enemyMsg = isWild
            ? `A wild ${enemyLead.getName()} appeared!`
            : `${this.config.enemy.getName()} sent out ${enemyLead.getName()}!`;
          this.logger.addItem(enemyMsg);
          applySwitchInAbilities(enemyLead, playerLead, this.weather, this.logger, this.generation, toast);

          this.logger.flush(() => {

            // 2. Player sends out their lead.
            this._spawnPlayerSpriteAnimated(() => {
              this.logger.addItem(`Go, ${playerLead.getName()}!`);
              applySwitchInAbilities(playerLead, enemyLead, this.weather, this.logger, this.generation, toast);

              this.logger.flush(() => {
                this.remapActivePokemon();
                this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
              });
            });
          });
        });
      };

      if (!isWild) {
        // 0. Show trainer sprite, log challenge message, then dismiss before Pokémon enters.
        this._spawnTrainerSprite(() => {
          this.logger.addItem(`${this.config.enemy.getDisplayName()} wants to battle!`);
          this.logger.flush(() => {
            this._dismissTrainerSprite(spawnBattle);
          });
        });
      } else {
        spawnBattle();
      }
    });
  }
  
}