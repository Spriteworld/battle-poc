import Phaser from 'phaser';
import StateMachine from '@Objects/StateMachine';
import { createInputManager, getInputManager, Action } from '@Utilities/InputManager.js';
import * as State from './states/index.js';
import applyEndOfTurnStatus from './applyEndOfTurnStatus.js';
import applyExperienceGains from './applyExperienceGains.js';
import applyEnemyExperienceGains from './applyEnemyExperienceGains.js';
import BattleLogger from '@Objects/ui/BattleLogger.js';
import AbilityToast from '@Objects/ui/AbilityToast.js';
import FieldScreensDisplay from '@Objects/ui/FieldScreensDisplay.js';
import WeatherDisplay from '@Objects/ui/WeatherDisplay.js';
import BattlePokemonSprite from '@Objects/battlescene/BattlePokemonSprite.js';
import BattleTrainerSprite from '@Objects/battlescene/BattleTrainerSprite.js';
import {
  ActivePokemonMenu,
  BattleMenu,
  AttackMenu,
  BagMenu,
  BattleTeamScreen,
  PokemonSwitchMenu,
} from '@Objects';
import pokeballSvg  from '@/assets/images/pokeball.svg';
import greatBallSvg from '@/assets/images/great-ball.svg';
import ultraBallSvg from '@/assets/images/ultra-ball.svg';
import masterBallSvg from '@/assets/images/master-ball.svg';

/** Maps item display names to their preloaded SVG asset URLs. */
const BALL_SVG = {
  'Poké Ball':   { key: 'item-ball-poke',   url: pokeballSvg  },
  'Great Ball':  { key: 'item-ball-great',  url: greatBallSvg  },
  'Ultra Ball':  { key: 'item-ball-ultra',  url: ultraBallSvg  },
  'Master Ball': { key: 'item-ball-master', url: masterBallSvg },
};

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
      POKEMON_CAUGHT:            'pokemonCaught',
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
      .addState(this.stateDef.POKEMON_CAUGHT,             new State.PokemonCaught)
    ;

    this.currentMenu = null;
    this.actions = {};
    this.currentAction = null;
    this.escapeAttempts = 0;
    this.payDayCoins    = 0;

    this._playerSprite  = null;
    this._enemySprite   = null;
    this._trainerSprite = null;

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
    this.tutorial        = data?.tutorial === true;
    this.forceCatch      = data?.forceCatch === true;
    this.scriptedActions = Array.isArray(data?.scriptedActions) ? [...data.scriptedActions] : null;
    this.autopilotLocked = false;
    if (this.game?.config?.debug?.console?.battle) {
      console.log('[BattleScene2.init] tutorial=', this.tutorial, 'forceCatch=', this.forceCatch, 'scriptedActions=', this.scriptedActions);
    }
  }

  create() {
    this._drawBackground();

    // Weather particles — behind screens and status boxes
    this.WeatherDisplay = new WeatherDisplay(this);

    // Field-side screen barriers — rendered directly on the battlefield, below all other UI
    this.FieldScreens = new FieldScreensDisplay(this);

    // Dialog box (bottom-left)
    this.logger = new BattleLogger(this, 0, UI_Y, DIALOG_W, UI_H, { textSpeed: this.data?.textSpeed ?? 'normal' });

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

    const im = createInputManager(this);
    // Menu navigation is suppressed while the tutorial autopilot is driving the
    // menus, so the player can't desync the scripted sequence. Logger advance
    // (Action.CONFIRM while the log is flushing) is always allowed — that is
    // the one input the tutorial expects.
    im.on(Action.UP,            () => !this.autopilotLocked && this.currentMenu?.moveSelectionUp());
    im.on(Action.DOWN,          () => !this.autopilotLocked && this.currentMenu?.moveSelectionDown());
    im.on(Action.LEFT,          () => !this.autopilotLocked && this.currentMenu?.moveSelectionLeft());
    im.on(Action.RIGHT,         () => !this.autopilotLocked && this.currentMenu?.moveSelectionRight());
    im.on(Action.LOGGER_TOGGLE, () => this.logger.toggle());
    im.on(Action.SCROLL_UP,     () => this.logger.scrollUp());
    im.on(Action.SCROLL_DOWN,   () => this.logger.scrollDown());
    im.on(Action.CONFIRM, () => {
      if (this.logger.isFlushing()) {
        this.logger.advance();
      } else if (!this.autopilotLocked) {
        this.currentMenu?.confirm();
      }
    });
    im.on(Action.CANCEL, () => {
      if (this.autopilotLocked) return;
      if (!this.currentMenu) return;
      if (typeof this.currentMenu.back === 'function' && this.currentMenu.back()) return;
      const items = this.currentMenu.config.menuItems;
      const last  = items[items.length - 1];
      if (last?.text().toLowerCase() === 'cancel') {
        this.events.emit(
          this.currentMenu.getName().toLowerCase() +
          '-select-option-' +
          (items.length - 1)
        );
      }
    });

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
      const playerSpecies = player.volatileStatus?.transformed || (player.pokemon?.nat_dex_id ?? player.species);
      this._playerSprite = new BattlePokemonSprite(this, 190, UI_Y - 12, {
        species:        playerSpecies,
        shiny:          player.isShiny ?? false,
        gender:         player.gender  ?? null,
        isBack:         true,
        size:           192,
        tilesetBaseUrl,
        tint:           player.volatileStatus?.transformed ? 0xaaddff : null,
      });
    }

    if (enemy) {
      const enemySpecies = enemy.volatileStatus?.transformed || (enemy.pokemon?.nat_dex_id ?? enemy.species);
      this._enemySprite = new BattlePokemonSprite(this, 610, UI_Y - 184, {
        species:        enemySpecies,
        shiny:          enemy.isShiny ?? false,
        gender:         enemy.gender  ?? null,
        isBack:         false,
        size:           128,
        tilesetBaseUrl,
        tint:           enemy.volatileStatus?.transformed ? 0xaaddff : null,
      });
    }
  }

  /**
   * Spawns the trainer sprite on the enemy side and plays its slide-in animation.
   * If the enemy config has no trainerSpriteUrl, calls callback immediately.
   * @param {Function} [callback] - Called when the animation completes.
   */
  _spawnTrainerSprite(callback) {
    const enemy          = this.config?.enemy;
    const tilesetBaseUrl = this.data?.tilesetBaseUrl ?? null;

    // Use the explicit sprite name, or derive one from the trainer's subclass title
    // (e.g. 'Ace Trainer' → 'ace_trainer') so BattleTrainerSprite can attempt both
    // the dedicated battle-art path and the overworld-sprite fallback path.
    const name = enemy?.trainerBattleSprite
      ?? (enemy?.trainerSubclass
          ? enemy.trainerSubclass.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
          : null);

    if (!name || !tilesetBaseUrl) {
      callback?.();
      return;
    }

    if (this._trainerSprite) {
      this._trainerSprite.destroy();
      this._trainerSprite = null;
    }

    this._trainerSprite = new BattleTrainerSprite(this, 610, UI_Y - 184, {
      name,
      tilesetBaseUrl,
      isEnemy: true,
    });
    this._trainerSprite.slideIn(callback);
  }

  /**
   * Slides the trainer sprite off-screen and destroys it.
   * @param {Function} [callback] - Called after the sprite is gone.
   */
  _dismissTrainerSprite(callback) {
    if (!this._trainerSprite) {
      callback?.();
      return;
    }
    this._trainerSprite.slideOut(() => {
      this._trainerSprite = null;
      callback?.();
    });
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

      // Award exp to the enemy's active Pokémon silently.
      const evo = this.applyEnemyExperienceGains();
      if (evo != null) {
        this.logger.addItem(
          `Oh! ${this.config.enemy.getName()}'s ${evo.fromName} evolved into ${evo.toName}!`
        );
        this.config.enemy.team.getActivePokemon().evolve(evo.targetId);
        this._refreshEnemySprite();
      }

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

      const deferEvolution = this.data?.deferEvolution ?? true;
      const hasEvolving = this.config.player.team.pokemon.some(p => p.readyToEvolve != null);
      const hasPending  = this.config.player.team.pokemon.some(
        p => p.pendingMovesToLearn?.length > 0
      );
      const nextPostBattle = (hasEvolving && !deferEvolution)
        ? this.stateDef.EVOLVE
        : hasPending
          ? this.stateDef.LEARN_MOVE
          : null;

      if (!this.config.enemy.team.switchToNextLivingPokemon()) {
        // Only log the wipe AFTER confirming there's nothing left to send out;
        // otherwise this fires on every trainer faint and lies about the outcome.
        if (!this.config.enemy.isWild) {
          this.logger.addItem('The enemy has no more Pokémon left!');
        }
        return nextPostBattle ?? this.stateDef.BATTLE_WON;
      }
      const newMon = this.config.enemy.team.getActivePokemon();
      newMon.isFirstTurn = true;
      this.logger.addItem(`${this.config.enemy.getName()} sent out ${newMon.getName()}!`);

      // Mid-fight scenarios: narrate when the trainer is down to their last
      // living Pokémon, then let their `midFightText` line land with weight.
      if (this.config.enemy.isTrainer) {
        const livingCount = this.config.enemy.team.pokemon
          .filter(p => p.currentHp > 0).length;
        if (livingCount === 1) {
          this.logger.addItem(`${this.config.enemy.getName()} is down to their last Pokémon!`);
        }
        if (this.config.enemy.midFightText) {
          this.logger.addItem(this.config.enemy.midFightText);
        }
      }
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

  applyEnemyExperienceGains() {
    return applyEnemyExperienceGains.call(this);
  }

  /**
   * Replaces the enemy Pokémon sprite in-place after a mid-battle evolution.
   * Destroys the current sprite and creates a fresh one at the same position
   * with no slide-in animation.
   */
  _refreshEnemySprite() {
    const tilesetBaseUrl = this.data?.tilesetBaseUrl;
    const enemy = this.config?.enemy?.team?.getActivePokemon();
    if (!enemy || !tilesetBaseUrl || !this._enemySprite) return;
    const x = this._enemySprite.x;
    const y = this._enemySprite.y;
    this._enemySprite.destroy();
    const enemySpecies = enemy.volatileStatus?.transformed || (enemy.pokemon?.nat_dex_id ?? enemy.species);
    this._enemySprite = new BattlePokemonSprite(this, x, y, {
      species:        enemySpecies,
      shiny:          enemy.isShiny ?? false,
      gender:         enemy.gender  ?? null,
      isBack:         false,
      size:           128,
      tilesetBaseUrl,
    });
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

  // ─── Pokéball animations ───────────────────────────────────────────────────

  /**
   * Plays the full Pokéball throw → absorb → shake → result sequence.
   * Loads the ball sprite on demand if it hasn't been cached yet.
   *
   * @param {string}   ballName - Display name of the thrown ball (unused visually, reserved).
   * @param {object}   target   - The enemy BattlePokemon being targeted.
   * @param {object}   result   - Result from BallItem.onUse ({ caught: boolean }).
   * @param {Function} callback - Called after the full animation completes.
   */
  playPokeballAnimation(ballName, target, result, callback) {
    if (!this._enemySprite || !this._playerSprite) {
      callback?.();
      return;
    }

    const { key: ballKey, url: ballPath } = BALL_SVG[ballName] ?? BALL_SVG['Poké Ball'];

    const launch = () => {
      const startX = this._playerSprite.x + 60;
      const startY = this._playerSprite.y - 80;
      const endX   = this._enemySprite.x;
      const endY   = this._enemySprite.y - 40;
      const midX   = (startX + endX) / 2;
      const midY   = Math.min(startY, endY) - 70;

      const ball = this.add.image(startX, startY, ballKey).setDisplaySize(20, 20).setDepth(10);

      // Phase 1 — arc throw (two-segment parabola)
      this.tweens.add({
        targets:  ball,
        x:        midX,
        y:        midY,
        duration: 200,
        ease:     'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets:  ball,
            x:        endX,
            y:        endY,
            duration: 200,
            ease:     'Sine.easeIn',
            onComplete: () => {
              // Phase 2 — enemy shrinks into ball
              this.tweens.add({
                targets:  this._enemySprite,
                scaleX:   0,
                scaleY:   0,
                alpha:    0.4,
                duration: 220,
                ease:     'Power2.easeIn',
                onComplete: () => {
                  this._enemySprite.setVisible(false);
                  this._enemySprite.setScale(1, 1);
                  this._enemySprite.setAlpha(1);

                  // Phase 3 — shakes, then result
                  const shakeCount = result.caught ? 3 : 2;
                  this._shakePokeballAnimation(ball, shakeCount, () => {
                    if (result.caught) {
                      this._pokeCaughtAnimation(ball, callback);
                    } else {
                      this._pokeEscapeAnimation(ball, callback);
                    }
                  });
                },
              });
            },
          });
        },
      });
    };

    if (this.textures.exists(ballKey)) {
      launch();
    } else {
      this.load.image(ballKey, ballPath);
      this.load.once('filecomplete-image-' + ballKey, launch);
      this.load.start();
    }
  }

  /**
   * Rocks the Pokéball sprite left → right → centre, repeated `count` times.
   *
   * @param {Phaser.GameObjects.Image} ball
   * @param {number}   count    - Number of shakes to play.
   * @param {Function} callback - Called after the last shake settles.
   */
  _shakePokeballAnimation(ball, count, callback) {
    if (count <= 0) {
      callback?.();
      return;
    }

    this.tweens.add({
      targets:  ball,
      angle:    -20,
      duration: 80,
      ease:     'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets:  ball,
          angle:    20,
          duration: 160,
          ease:     'Sine.easeInOut',
          onComplete: () => {
            this.tweens.add({
              targets:  ball,
              angle:    0,
              duration: 80,
              ease:     'Sine.easeIn',
              onComplete: () => this.time.delayedCall(180, () =>
                this._shakePokeballAnimation(ball, count - 1, callback)
              ),
            });
          },
        });
      },
    });
  }

  /**
   * Plays the catch-success animation: ball flashes then fades out.
   *
   * @param {Phaser.GameObjects.Image} ball
   * @param {Function} callback
   */
  _pokeCaughtAnimation(ball, callback) {
    this.tweens.add({
      targets:  ball,
      alpha:    0.15,
      duration: 80,
      yoyo:     true,
      repeat:   3,
      onComplete: () => {
        this.tweens.add({
          targets:  ball,
          scaleX:   0.8,
          scaleY:   0.8,
          alpha:    0,
          duration: 350,
          ease:     'Power2.easeOut',
          onComplete: () => {
            ball.destroy();
            callback?.();
          },
        });
      },
    });
  }

  /**
   * Plays the escape animation: ball flashes open, enemy sprite pops back in.
   *
   * @param {Phaser.GameObjects.Image} ball
   * @param {Function} callback
   */
  _pokeEscapeAnimation(ball, callback) {
    this.tweens.add({
      targets:  ball,
      scaleX:   1,
      scaleY:   1,
      alpha:    0,
      duration: 150,
      ease:     'Power2.easeOut',
      onComplete: () => {
        ball.destroy();
        const sprite = this._enemySprite;
        sprite.setVisible(true);
        sprite.setScale(0, 0);
        this.tweens.add({
          targets:  sprite,
          scaleX:   1,
          scaleY:   1,
          duration: 220,
          ease:     'Back.easeOut',
          onComplete: () => callback?.(),
        });
      },
    });
  }
}
