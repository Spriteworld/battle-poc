import Phaser from 'phaser';
import PokemonStatusBox from '../ui/PokemonStatusBox.js';
import EnemyTrainerStatusBox from '../ui/EnemyTrainerStatusBox.js';

/**
 * Holds both Pokémon status boxes (enemy top-left, player bottom-right).
 *
 * remap({ playerPokemon, enemyPokemon, enemyTrainer }) accepts BattlePokemon
 * objects and the enemy trainer (BattleTrainer | WildTrainer) for the team
 * pokéball row.
 *
 * @extends Phaser.GameObjects.Container
 */
export default class ActivePokemonMenu extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} enemyX
   * @param {number} enemyY
   * @param {number} playerX
   * @param {number} playerY
   */
  constructor(scene, enemyX, enemyY, playerX, playerY) {
    super(scene, 0, 0);

    this.name = 'ActivePokemonMenu';
    this.config = { selected: false, menuItems: [], menuItemIndex: 0 };

    this._enemyBox = new EnemyTrainerStatusBox(scene, enemyX, enemyY);

    this._playerBox = new PokemonStatusBox(scene, playerX, playerY, {
      showHpNumbers: true,
      isEnemy: false,
      width: 340,
    });

    scene.add.existing(this);
  }

  /**
   * Refreshes both status boxes.
   * @param {object} opts
   * @param {object} opts.playerPokemon  - Active player BattlePokemon.
   * @param {object} opts.enemyPokemon   - Active enemy BattlePokemon (may be null).
   * @param {object} opts.enemyTrainer   - BattleTrainer | WildTrainer instance.
   */
  remap({ playerPokemon, enemyPokemon, enemyTrainer }) {
    if (playerPokemon) {
      this._playerBox.remap({
        name:           playerPokemon.getName(),
        level:          playerPokemon.level,
        currentHp:      playerPokemon.currentHp,
        maxHp:          playerPokemon.maxHp,
        exp:            playerPokemon.exp ?? 0,
        growth:         playerPokemon.pokemon?.growth,
        status:         playerPokemon.status,
        stages:         playerPokemon.stages,
        gender:         playerPokemon.gender,
        volatileStatus: playerPokemon.volatileStatus,
        pokerus:        playerPokemon.pokerus,
      });
    }

    const isWild      = enemyTrainer?.isWild ?? false;
    const trainerName = isWild ? '' : (enemyTrainer?.getName?.() ?? '');
    const team        = isWild ? [] : (enemyTrainer?.team?.pokemon ?? []);
    this._enemyBox.remap(trainerName, team, enemyPokemon ?? null, isWild);
  }

  /**
   * Calls callback once the player EXP bar animation finishes (or immediately
   * on the next frame if no animation is running).
   * @param {Function} callback
   */
  waitForExpAnimation(callback) {
    this._playerBox.waitForExpAnimation(callback);
  }

  /** Visual turn indicator — no-op for now, boxes are always visible. */
  select(_index) {}
  deselect() {}
  clear() {}
}
