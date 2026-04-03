import Phaser from 'phaser';
import StateMachine from '@Objects/StateMachine';
import * as State from './states/index.js';
import applyEndOfTurnStatus from './applyEndOfTurnStatus.js';
import applyExperienceGains from './applyExperienceGains.js';
import BattleLogger from '@Objects/ui/BattleLogger.js';
import AbilityToast from '@Objects/ui/AbilityToast.js';
import FieldScreensDisplay from '@Objects/ui/FieldScreensDisplay.js';
import WeatherDisplay from '@Objects/ui/WeatherDisplay.js';
import BattlePokemonSprite from '@Objects/battlescene/BattlePokemonSprite.js';
import {
  ActivePokemonMenu,
  BattleMenu,
  AttackMenu,
  BagMenu,
  BattleTeamScreen,
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
export default class BattleScene2 extends Phaser.Scene {
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
      LEARN_MOVE:                'learnMove',
      EVOLVE:                    'evolve',
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
      .addState(this.stateDef.LEARN_MOVE,                 new State.LearnMove)
      .addState(this.stateDef.EVOLVE,                     new State.Evolution)
    ;

    this.currentMenu = null;
    this.actions = {};
    this.currentAction = null;
    this.escapeAttempts = 0;

    this._playerSprite = null;
    this._enemySprite  = null;

    /** Field-side screens and entry hazards. Screen counters = turns remaining (0 = not active). */
    this.screens = {
      player: { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
    };

    /** Active weather — type is null when no weather is in effect. */
    this.weather = { type: null, turnsLeft: 0 };
  }

  init(data) {
    this.data = {
      ...data,
      tilesetBaseUrl: data?.tilesetBaseUrl ?? import.meta.env.VITE_ASSETS_URL,
    };
  }

  create() {
    this._drawBackground();

    // Weather particles — behind screens and status boxes
    this.WeatherDisplay = new WeatherDisplay(this);

    // Field-side screen barriers — rendered directly on the battlefield, below all other UI
    this.FieldScreens = new FieldScreensDisplay(this);

    // Dialog box (bottom-left)
    this.logger = new BattleLogger(this, 0, UI_Y, DIALOG_W, UI_H);

    // Status boxes (enemy top-left, player bottom-right)
    this.ActivePokemonMenu = new ActivePokemonMenu(
      this,
      ENEMY_BOX.x,  ENEMY_BOX.y,
      PLAYER_BOX.x, PLAYER_BOX.y
    );

    // All menus pre-created at the action panel position, hidden until needed
    this.BattleMenu        = new BattleMenu(this,        ACTION_X, UI_Y);
    this.AttackMenu        = new AttackMenu(this,        ACTION_X, UI_Y);
    this.BagMenu           = new BagMenu(this,           0, 0);
    this.PokemonTeamMenu   = new BattleTeamScreen(this);
    this.PokemonSwitchMenu = new PokemonSwitchMenu(this, ACTION_X, UI_Y);
    this.BagMenu.setDepth(10);
    this.PokemonTeamMenu.setDepth(10);
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
    this.WeatherDisplay.tick(time);
  }

  // ─── Background ────────────────────────────────────────────────────────────

  // Sky and ground colour palettes per weather type.
  static BG_PALETTES = {
    null:        { skyTop: 0x78b8f0, skyBot: 0xb8dff8, gndTop: 0x68a838, gndBot: 0x48882a },
    rain:        { skyTop: 0x405878, skyBot: 0x708898, gndTop: 0x507030, gndBot: 0x385820 },
    sun:         { skyTop: 0x68c0f8, skyBot: 0xf0d870, gndTop: 0x80c840, gndBot: 0x60a030 },
    sandstorm:   { skyTop: 0xc07820, skyBot: 0xe0a040, gndTop: 0x987040, gndBot: 0x785830 },
    hail:        { skyTop: 0x5878a0, skyBot: 0x90b0c8, gndTop: 0x508858, gndBot: 0x387040 },
  };

  _drawBackground() {
    this._skyGfx    = this.add.graphics();
    this._groundGfx = this.add.graphics();
    this._updateBackground(null);

    // Static elements drawn once — border and platforms.
    const border = this.add.graphics();
    border.lineStyle(4, 0x181818);
    border.lineBetween(0, UI_Y, 800, UI_Y);
    border.lineBetween(ACTION_X, UI_Y, ACTION_X, 600);

    this._platformsGfx = this.add.graphics();
    this._updatePlatforms(null);
  }

  _updateBackground(weatherType) {
    const pal = BattleScene2.BG_PALETTES[weatherType] ?? BattleScene2.BG_PALETTES[null];

    this._skyGfx.clear();
    this._skyGfx.fillGradientStyle(pal.skyTop, pal.skyTop, pal.skyBot, pal.skyBot, 1);
    this._skyGfx.fillRect(0, 0, 800, UI_Y);

    this._groundGfx.clear();
    this._groundGfx.fillGradientStyle(pal.gndTop, pal.gndTop, pal.gndBot, pal.gndBot, 1);
    this._groundGfx.fillRect(0, UI_Y - 90, 800, 90);
  }

  _updatePlatforms(weatherType) {
    const color = weatherType === 'sandstorm' ? 0xb89060
                : weatherType === 'hail'      ? 0x70a888
                : 0x80b848;
    this._platformsGfx.clear();
    this._platformsGfx.fillStyle(color, 0.5);
    this._platformsGfx.fillEllipse(190, UI_Y - 28,  210, 40);
    this._platformsGfx.fillEllipse(610, UI_Y - 168, 170, 32);
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
    // Active menu — route all navigation to it.
    switch (event.code) {
      case 'ArrowUp':    this.currentMenu?.moveSelectionUp(); break;
      case 'ArrowDown':  this.currentMenu?.moveSelectionDown(); break;
      case 'ArrowLeft':  this.currentMenu?.moveSelectionLeft(); break;
      case 'ArrowRight': this.currentMenu?.moveSelectionRight(); break;
      case 'KeyL':       this.logger.toggle(); break;
      case 'PageUp':     this.logger.scrollUp(); break;
      case 'PageDown':   this.logger.scrollDown(); break;
      case 'Enter':
      case 'KeyZ':
        if (this.logger.isFlushing()) {
          this.logger.advance();
        } else {
          this.currentMenu?.confirm();
        }
        break;
      case 'Escape':
      case 'KeyX': {
        if (!this.currentMenu) break;
        if (typeof this.currentMenu.back === 'function' && this.currentMenu.back()) break;
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
    this.ActivePokemonMenu.remap({
      playerPokemon: this.config.player.team.getActivePokemon(),
      enemyPokemon:  this.config.enemy.team.getActivePokemon(),
      enemyTrainer:  this.config.enemy,
    });
    this.FieldScreens.update(this.screens);
    this.WeatherDisplay.setWeather(this.weather);
    this._updateBackground(this.weather?.type ?? null);
    this._updatePlatforms(this.weather?.type ?? null);
    this._updatePokemonSprites();
  }

  /**
   * Shows a floating ability-name toast over the given Pokémon's sprite.
   * @param {object} mon         - BattlePokemon instance.
   * @param {string} abilityName - Display name of the ability.
   */
  showAbilityToast(mon, abilityName) {
    if (!mon || !abilityName) return;
    const isPlayer = mon === this.config?.player?.team?.getActivePokemon();
    const x = isPlayer ? 190 : 610;
    const y = isPlayer ? UI_Y - 150 : UI_Y - 196;
    new AbilityToast(this, x, y, abilityName);
  }

  /**
   * Plays a basic physical-contact (tackle) animation: the attacker lunges
   * toward the target, the target flashes on impact, then the attacker returns.
   * Falls back to calling callback immediately if sprites aren't ready.
   *
   * @param {object}   attackerMon - BattlePokemon that is attacking.
   * @param {object}   defenderMon - BattlePokemon that is defending.
   * @param {Function} callback    - Called when the animation finishes.
   */
  playAttackAnimation(attackerMon, defenderMon, callback) {
    const isPlayerAttacking = attackerMon === this.config?.player?.team?.getActivePokemon();
    const attackerSprite    = isPlayerAttacking ? this._playerSprite : this._enemySprite;
    const defenderSprite    = isPlayerAttacking ? this._enemySprite  : this._playerSprite;

    if (!attackerSprite || !defenderSprite) {
      callback?.();
      return;
    }

    const originX = attackerSprite.x;
    const lungeX  = isPlayerAttacking ? originX + 120 : originX - 120;

    // 1. Attacker lunges toward the target.
    this.tweens.add({
      targets:  attackerSprite,
      x:        lungeX,
      duration: 120,
      ease:     'Power2.easeIn',
      onComplete: () => {
        // 2. Target flashes on impact.
        this.tweens.add({
          targets:  defenderSprite,
          alpha:    0,
          duration: 60,
          ease:     'Linear',
          yoyo:     true,
          repeat:   2,
          onComplete: () => {
            // 3. Attacker returns to its resting position.
            this.tweens.add({
              targets:  attackerSprite,
              x:        originX,
              duration: 150,
              ease:     'Power2.easeOut',
              onComplete: () => callback?.(),
            });
          },
        });
      },
    });
  }

  _updatePokemonSprites() {
    const tilesetBaseUrl = this.data?.tilesetBaseUrl;
    if (!tilesetBaseUrl || !this.config?.player) return;

    const player = this.config.player.team.getActivePokemon();
    const enemy  = this.config.enemy.team.getActivePokemon();

    if (this._playerSprite) { this._playerSprite.destroy(); this._playerSprite = null; }
    if (this._enemySprite)  { this._enemySprite.destroy();  this._enemySprite  = null; }

    if (player) {
      this._playerSprite = new BattlePokemonSprite(this, 190, UI_Y - 12, {
        species:        player.pokemon?.nat_dex_id ?? player.species,
        shiny:          player.isShiny ?? false,
        gender:         player.gender  ?? null,
        isBack:         true,
        size:           192,
        tilesetBaseUrl,
      });
    }

    if (enemy) {
      this._enemySprite = new BattlePokemonSprite(this, 610, UI_Y - 184, {
        species:        enemy.pokemon?.nat_dex_id ?? enemy.species,
        shiny:          enemy.isShiny ?? false,
        gender:         enemy.gender  ?? null,
        isBack:         false,
        size:           128,
        tilesetBaseUrl,
      });
    }
  }

  /**
   * Creates the enemy sprite and plays its slide-in animation.
   * Destroys any existing enemy sprite first.
   * @param {Function} [callback] - Called when the animation completes.
   */
  _spawnEnemySpriteAnimated(callback) {
    const tilesetBaseUrl = this.data?.tilesetBaseUrl;
    const enemy = this.config?.enemy?.team?.getActivePokemon();
    if (!enemy || !tilesetBaseUrl) { callback?.(); return; }

    if (this._enemySprite) { this._enemySprite.destroy(); this._enemySprite = null; }

    this._enemySprite = new BattlePokemonSprite(this, 610, UI_Y - 184, {
      species:        enemy.pokemon?.nat_dex_id ?? enemy.species,
      shiny:          enemy.isShiny  ?? false,
      gender:         enemy.gender   ?? null,
      isBack:         false,
      size:           128,
      tilesetBaseUrl,
    });
    this._enemySprite.slideIn(callback);
  }

  /**
   * Creates the player sprite and plays its slide-in animation.
   * Destroys any existing player sprite first.
   * @param {Function} [callback] - Called when the animation completes.
   */
  _spawnPlayerSpriteAnimated(callback) {
    const tilesetBaseUrl = this.data?.tilesetBaseUrl;
    const player = this.config?.player?.team?.getActivePokemon();
    if (!player || !tilesetBaseUrl) { callback?.(); return; }

    if (this._playerSprite) { this._playerSprite.destroy(); this._playerSprite = null; }

    this._playerSprite = new BattlePokemonSprite(this, 190, UI_Y - 12, {
      species:        player.pokemon?.nat_dex_id ?? player.species,
      shiny:          player.isShiny  ?? false,
      gender:         player.gender   ?? null,
      isBack:         true,
      size:           192,
      tilesetBaseUrl,
    });
    this._playerSprite.slideIn(callback);
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
      this.logger.addItem('The enemy\'s active Pokémon fainted!');
      // Clear any pending enemy action — the fainted Pokémon can't act.
      delete this.actions.enemy;

      // Award EXP for this faint immediately.
      this.applyExperienceGains();

      const hasEvolving = this.config.player.team.pokemon.some(p => p.readyToEvolve != null);
      const hasPending  = this.config.player.team.pokemon.some(
        p => p.pendingMovesToLearn?.length > 0
      );
      const nextPostBattle = hasEvolving 
        ? this.stateDef.EVOLVE
          : hasPending                     
            ? this.stateDef.LEARN_MOVE
            : null;

      if (!this.config.enemy.team.switchToNextLivingPokemon()) {
        this.logger.addItem('The enemy has no more Pokémon left!');
        return nextPostBattle ?? this.stateDef.BATTLE_WON;
      }
      const newMon = this.config.enemy.team.getActivePokemon();
      newMon.isFirstTurn = true;
      this.logger.addItem(`${this.config.enemy.getName()} sent out ${newMon.getName()}!`);
      if (nextPostBattle) return nextPostBattle;
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
    applyEndOfTurnStatus.call(this);
  }

  applyExperienceGains() {
    applyExperienceGains.call(this);
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
