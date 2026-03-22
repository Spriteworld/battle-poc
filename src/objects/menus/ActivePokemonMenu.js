import Phaser from 'phaser';
import PokemonStatusBox from '../ui/PokemonStatusBox.js';

/**
 * Holds both Pokémon status boxes (enemy top-left, player bottom-right).
 *
 * remap([enemyPokemon, playerPokemon]) accepts BattlePokemon objects.
 * select(0) highlights the enemy side; select(1) highlights the player side.
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

    this._enemyBox = new PokemonStatusBox(scene, enemyX, enemyY, {
      showHpNumbers: false,
      width: 220,
    });

    this._playerBox = new PokemonStatusBox(scene, playerX, playerY, {
      showHpNumbers: true,
      width: 340,
    });

    scene.add.existing(this);
  }

  /**
   * Refreshes both status boxes.
   * @param {Array} pokemon - [playerPokemon, enemyPokemon] BattlePokemon instances
   */
  remap([playerPokemon, enemyPokemon]) {
    if (playerPokemon) {
      this._playerBox.remap({
        name: playerPokemon.getName(),
        level: playerPokemon.level,
        currentHp: playerPokemon.currentHp,
        maxHp: playerPokemon.maxHp,
        status: playerPokemon.status,
        stages: playerPokemon.stages,
        gender: playerPokemon.gender,
      });
    }
    if (enemyPokemon) {
      this._enemyBox.remap({
        name: enemyPokemon.getName(),
        level: enemyPokemon.level,
        currentHp: enemyPokemon.currentHp,
        maxHp: enemyPokemon.maxHp,
        status: enemyPokemon.status,
        stages: enemyPokemon.stages,
        gender: enemyPokemon.gender,
      });
    }
  }

  /** Visual turn indicator — no-op for now, boxes are always visible. */
  select(_index) {}
  deselect() {}
  clear() {}
}
