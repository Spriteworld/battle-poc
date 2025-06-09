import Phaser from 'phaser';
import StateMachine from '@Objects/StateMachine';
import * as State from './states/index.js';
import Log from '@Objects/Log';
import { ActivePokemonMenu } from '@Objects';

export default class extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene2' });
    this.data = {};
    this.logger = {};

    this.stateDef = {
      BATTLE_IDLE: 'battleIdle',
      BATTLE_START: 'battleStart',
      BEFORE_ACTION: 'beforeAction',
      PLAYER_ACTION: 'playerAction',
      PLAYER_ATTACK: 'playerAttack',
      PLAYER_BAG: 'playerBag',
      PLAYER_POKEMON: 'playerPokemon',
      ENEMY_ACTION: 'enemyAction',
      APPLY_ACTIONS: 'applyActions',
      BATTLE_END: 'battleEnd',
      BATTLE_WON: 'battleWon',
      BATTLE_LOST: 'battleLost',
    };

    this.stateMachine = new StateMachine(this)
      .addState(this.stateDef.BATTLE_IDLE,    new State.BattleIdle)
      .addState(this.stateDef.BATTLE_START,   new State.BattleStart)
      .addState(this.stateDef.PLAYER_ACTION,  new State.PlayerAction)
      .addState(this.stateDef.PLAYER_ATTACK,  new State.PlayerAttack)
      .addState(this.stateDef.PLAYER_BAG,     new State.PlayerBag)
      .addState(this.stateDef.PLAYER_POKEMON, new State.PlayerPokemon)
      .addState(this.stateDef.BEFORE_ACTION,  new State.BeforeAction)
      .addState(this.stateDef.ENEMY_ACTION,   new State.EnemyAction)
      .addState(this.stateDef.APPLY_ACTIONS,  new State.ApplyActions)
      .addState(this.stateDef.BATTLE_END,     new State.BattleEnd)
      .addState(this.stateDef.BATTLE_WON,     new State.BattleWon)
      .addState(this.stateDef.BATTLE_LOST,    new State.BattleLost)
    ;

    this.activePokemonMenu = {};
    this.currentMenu = {};
    
    this.actions = [];
    this.currentAction = null;
  }

  init(data) {
    this.data = data;
    console.log('[BattleScene2] init', data);
  }
  
  create() {
    this.logger = new Log(this, 370, 10);
    this.logger.addItem('Battle Initiated...');

    this.activePokemonMenu = new ActivePokemonMenu(this, 10, 10);

    this.input.keyboard.on('keydown', this.onKeyInput, this);
    
    this.stateMachine.setState(this.stateDef.BATTLE_START);
  }

  update(time, delta) {
    this.stateMachine.update(time);
  }

  addLogger(log) {
    this.logger = log;
  }

  activateMenu(menu) {
    // this.currentMenu;
    console.log('[BattleScene2] activateMenu', menu.name, menu);
    this.currentMenu = menu;
    this.currentMenu.select(0);
  }

  onKeyInput(event) {
    if (!this.currentMenu) {
      console.warn('[BattleScene2] No current menu to handle input');
      return;
    }

    if (event.code === 'ArrowUp') {
      this.currentMenu.moveSelectionUp();
    } else if (event.code === 'ArrowDown') {
      this.currentMenu.moveSelectionDown();
    } else if (event.code === 'ArrowRight') {
    } else if (event.code === 'ArrowLeft') {
    } else if (event.code === 'Enter') {
      this.currentMenu.confirm();
    }
  }

  checkForDeadActivePokemon() {
    // check if the active pokemon of the player is dead
    if (!this.config.player.team.getActivePokemon().isAlive()) {
      this.logger.addItem('Your active Pokémon fainted!');

      if (!this.config.player.team.hasLivingPokemon()) {
        this.logger.addItem('You have no more Pokémon left!');
        return (this.stateDef.BATTLE_LOST);
      } else {
        return (this.stateDef.PLAYER_POKEMON);
      }
    }

    // check if the active pokemon of the enemy is dead
    if (!this.config.enemy.team.getActivePokemon().isAlive()) {
      this.logger.addItem('The enemy\'s active Pokémon fainted!');

      if (!this.config.enemy.team.switchToNextLivingPokemon()) {
        this.logger.addItem('The enemy has no more Pokémon left!');
        this.remapActivePokemon();
        return (this.stateDef.BATTLE_WON);
      }
    }

    return null;
  }

  remapActivePokemon() {
    this.activePokemonMenu.remap(
      [
        this.config.player.team.getActivePokemon(), 
        this.config.enemy.team.getActivePokemon(), 
      ].map(pkmn => {
        let trainerName = pkmn.originalTrainer;
        let nickname = pkmn.getName();
        let hpCurr = pkmn.currentHp;
        let hpMax = pkmn.maxHp;
        let level = pkmn.level;
        return `${trainerName} - ${nickname} Lv${level} (${hpCurr} / ${hpMax})`;
      })
    );

    this.activePokemonMenu.select(this.data.playerTurn === 'player' ? 0 : 1);
  }


  checkForEndOfBattle() {
    // do we have living pokemon on the players team?
    if (!this.config.player.team.hasLivingPokemon()) {
      return true;
    }
    // or on the enemies team?
    if (!this.config.enemy.team.hasLivingPokemon()) {
      return true;
    }

    return false;
  }
}
