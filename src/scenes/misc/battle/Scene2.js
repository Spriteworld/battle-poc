import Phaser from 'phaser';
import StateMachine from '@Objects/StateMachine';
import * as State from './states/index.js';
import { STATUS } from '@spriteworld/pokemon-data';
import DialogBox from '@Objects/ui/DialogBox.js';
import {
  ActivePokemonMenu,
  BattleMenu,
  AttackMenu,
  BagMenu,
  PokemonTeamMenu,
  PokemonSwitchMenu,
} from '@Objects';

// ─── Layout ────────────────────────────────────────────────────────────────
// Canvas: 800 × 600
const UI_Y      = 370;   // y-start of the bottom strip
const UI_H      = 230;   // height of the bottom strip
const DIALOG_W  = 490;   // width of the dialog box
const ACTION_X  = 490;   // x-start of the action panel

const ENEMY_BOX  = { x: 20,  y: 15  };
const PLAYER_BOX = { x: 430, y: 288 };

/**
 * Main battle scene.  Owns the state machine and all UI objects.
 * All battle state classes are bound to this scene instance.
 * @extends Phaser.Scene
 */
export default class extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene2' });
    this.data = {};
    this.logger = {};

    this.stateDef = {
      BATTLE_IDLE:               'battleIdle',
      BATTLE_START:              'battleStart',
      BEFORE_ACTION:             'beforeAction',
      PLAYER_ACTION:             'playerAction',
      PLAYER_ATTACK:             'playerAttack',
      PLAYER_BAG:                'playerBag',
      PLAYER_POKEMON:            'playerPokemon',
      PLAYER_NEW_ACTIVE_POKEMON: 'playerNewActivePokemon',
      ENEMY_ACTION:              'enemyAction',
      APPLY_ACTIONS:             'applyActions',
      BATTLE_END:                'battleEnd',
      BATTLE_WON:                'battleWon',
      BATTLE_LOST:               'battleLost',
    };

    this.stateMachine = new StateMachine(this)
      .addState(this.stateDef.BATTLE_IDLE,                new State.BattleIdle)
      .addState(this.stateDef.BATTLE_START,               new State.BattleStart)
      .addState(this.stateDef.PLAYER_ACTION,              new State.PlayerAction)
      .addState(this.stateDef.PLAYER_ATTACK,              new State.PlayerAttack)
      .addState(this.stateDef.PLAYER_BAG,                 new State.PlayerBag)
      .addState(this.stateDef.PLAYER_POKEMON,             new State.PlayerPokemon)
      .addState(this.stateDef.PLAYER_NEW_ACTIVE_POKEMON,  new State.PlayerNewActivePokemon)
      .addState(this.stateDef.BEFORE_ACTION,              new State.BeforeAction)
      .addState(this.stateDef.ENEMY_ACTION,               new State.EnemyAction)
      .addState(this.stateDef.APPLY_ACTIONS,              new State.ApplyActions)
      .addState(this.stateDef.BATTLE_END,                 new State.BattleEnd)
      .addState(this.stateDef.BATTLE_WON,                 new State.BattleWon)
      .addState(this.stateDef.BATTLE_LOST,                new State.BattleLost)
    ;

    this.currentMenu = null;
    this.actions = {};
    this.currentAction = null;
    this.escapeAttempts = 0;
  }

  init(data) {
    this.data = data;
  }

  create() {
    this._drawBackground();

    // Dialog box (bottom-left)
    this.logger = new DialogBox(this, 0, UI_Y, DIALOG_W, UI_H, 9);

    // Status boxes (enemy top-left, player bottom-right)
    this.ActivePokemonMenu = new ActivePokemonMenu(
      this,
      ENEMY_BOX.x,  ENEMY_BOX.y,
      PLAYER_BOX.x, PLAYER_BOX.y
    );

    // All menus pre-created at the action panel position, hidden until needed
    this.BattleMenu        = new BattleMenu(this,        ACTION_X, UI_Y);
    this.AttackMenu        = new AttackMenu(this,        ACTION_X, UI_Y);
    this.BagMenu           = new BagMenu(this,           ACTION_X, UI_Y);
    this.PokemonTeamMenu   = new PokemonTeamMenu(this,   ACTION_X, UI_Y);
    this.PokemonSwitchMenu = new PokemonSwitchMenu(this, ACTION_X, UI_Y);
    [
      this.BattleMenu,
      this.AttackMenu,
      this.BagMenu,
      this.PokemonTeamMenu,
      this.PokemonSwitchMenu,
    ].forEach(m => m.setVisible(false));

    this.input.keyboard.on('keydown', this.onKeyInput, this);
    this.stateMachine.setState(this.stateDef.BATTLE_START);
  }

  update(time) {
    this.stateMachine.update(time);
  }

  // ─── Background ────────────────────────────────────────────────────────────

  _drawBackground() {
    // Sky
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x78b8f0, 0x78b8f0, 0xb8dff8, 0xb8dff8, 1);
    sky.fillRect(0, 0, 800, UI_Y);

    // Ground
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x68a838, 0x68a838, 0x48882a, 0x48882a, 1);
    ground.fillRect(0, UI_Y - 90, 800, 90);

    // Battle area / UI strip divider
    const border = this.add.graphics();
    border.lineStyle(4, 0x181818);
    border.lineBetween(0, UI_Y, 800, UI_Y);
    border.lineBetween(ACTION_X, UI_Y, ACTION_X, 600);

    // Platforms (ellipses under where sprites will stand)
    const platforms = this.add.graphics();
    platforms.fillStyle(0x80b848, 0.5);
    platforms.fillEllipse(190, UI_Y - 28, 210, 40);   // player side
    platforms.fillEllipse(610, UI_Y - 168, 170, 32);  // enemy side

    // Placeholder silhouettes until sprites are loaded
    this._silhouette(190, UI_Y - 90,  88, 0x282848, true);
    this._silhouette(610, UI_Y - 198, 62, 0x203820, false);
  }

  /**
   * Draws a rough oval silhouette where a Pokémon sprite will go.
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @param {number} color
   * @param {boolean} isPlayer
   */
  _silhouette(x, y, size, color, isPlayer) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.45);
    g.fillEllipse(x, y, size * (isPlayer ? 1.5 : 1), size * 0.75);
    g.fillEllipse(x, y - size * 0.55, size * 0.85, size * 0.85);
  }

  // ─── Menu management ───────────────────────────────────────────────────────

  /**
   * Switches the visible/active menu.  Hides the previous menu and shows the
   * new one at index 0.
   * @param {Menu} menu
   */
  activateMenu(menu) {
    if (this.currentMenu && this.currentMenu !== menu) {
      this.currentMenu.setVisible(false);
    }
    this.currentMenu = menu;
    this.currentMenu.setVisible(true);
    this.currentMenu.select(0);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  onKeyInput(event) {
    if (!this.currentMenu || !this.currentMenu.config?.selected) return;

    switch (event.code) {
      case 'ArrowUp':    this.currentMenu.moveSelectionUp();     break;
      case 'ArrowDown':  this.currentMenu.moveSelectionDown();   break;
      case 'ArrowLeft':  this.currentMenu.moveSelectionLeft?.(); break;
      case 'ArrowRight': this.currentMenu.moveSelectionRight?.(); break;
      case 'Enter':
      case 'KeyZ':
        this.currentMenu.confirm();
        break;
      case 'Escape':
      case 'KeyX': {
        const items = this.currentMenu.config.menuItems;
        const last  = items[items.length - 1];
        if (last?.text().toLowerCase() === 'cancel') {
          this.events.emit(
            this.currentMenu.getName().toLowerCase() +
            '-select-option-' +
            (items.length - 1)
          );
        }
        break;
      }
    }
  }

  // ─── Battle helpers ────────────────────────────────────────────────────────

  remapActivePokemon() {
    this.ActivePokemonMenu.remap([
      this.config.player.team.getActivePokemon(),
      this.config.enemy.team.getActivePokemon(),
    ]);
  }

  /**
   * @return {string|null} Next state key if a side has fainted, otherwise null.
   */
  checkForDeadActivePokemon() {
    if (!this.config.player.team.getActivePokemon().isAlive()) {
      this.logger.addItem('Your active Pokémon fainted!');
      // Clear any pending player action — the fainted Pokémon can't act.
      delete this.actions.player;
      if (!this.config.player.team.hasLivingPokemon()) {
        this.logger.addItem('You have no more Pokémon left!');
        return this.stateDef.BATTLE_LOST;
      }
      return this.stateDef.PLAYER_NEW_ACTIVE_POKEMON;
    }

    if (!this.config.enemy.team.getActivePokemon().isAlive()) {
      this.logger.addItem("The enemy's active Pokémon fainted!");
      // Clear any pending enemy action — the fainted Pokémon can't act.
      delete this.actions.enemy;
      if (!this.config.enemy.team.switchToNextLivingPokemon()) {
        this.logger.addItem('The enemy has no more Pokémon left!');
        this.remapActivePokemon();
        return this.stateDef.BATTLE_WON;
      }
      this.remapActivePokemon();
    }

    return null;
  }

  /**
   * Applies end-of-turn status damage to both active Pokémon.
   * Called by BeforeAction when all queued actions have been resolved.
   *
   * Ticks: burn (−1/8 max HP), poison (−1/8 max HP), toxic (escalating).
   * Skips fainted Pokémon so log messages stay sensible.
   */
  applyEndOfTurnStatus() {
    const mons = [
      this.config.player.team.getActivePokemon(),
      this.config.enemy.team.getActivePokemon(),
    ];

    for (const mon of mons) {
      if (!mon.isAlive()) continue;

      if (mon.status[STATUS.BURN] > 0) {
        const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
        mon.takeDamage(dmg);
        this.logger.addItem(`${mon.getName()} is hurt by its burn!`);
      }

      if (mon.status[STATUS.POISON] > 0) {
        const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
        mon.takeDamage(dmg);
        this.logger.addItem(`${mon.getName()} is hurt by poison!`);
      }

      if (mon.status[STATUS.TOXIC] > 0) {
        mon.toxicCount = (mon.toxicCount || 0) + 1;
        const dmg = Math.max(1, Math.floor(mon.maxHp * mon.toxicCount / 16));
        mon.takeDamage(dmg);
        this.logger.addItem(`${mon.getName()} is hurt by poison!`);
      }
    }

    this.remapActivePokemon();
  }

  checkForEndOfBattle() {
    return (
      !this.config.player.team.hasLivingPokemon() ||
      !this.config.enemy.team.hasLivingPokemon()
    );
  }

  /** Legacy support — states that call this.addLogger() won't break. */
  addLogger(log) {
    this.logger = log;
  }
}
