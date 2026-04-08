import Phaser from 'phaser';
import BattleUI from '@Scenes/misc/battle/UI.js';
import BattleScene from '@Scenes/misc/battle/Scene.js';
import BattleScene2 from '@Scenes/misc/battle/Scene2.js';
import EvolutionScene from '@Scenes/misc/EvolutionScene.js';
const Scenes = { BattleUI, BattleScene, BattleScene2, EvolutionScene };
import * as pokemon from '@Data/pokemon/';
import Items from '@Data/items/';
import { Pokedex, GAMES, NATURES, STATS, GENDERS, Moves } from '@spriteworld/pokemon-data';

// ─── Dev switch ───────────────────────────────────────────────────────────────
/**
 * Set to true to fight randomly generated teams instead of the hardcoded battle.
 * Each reload picks new species and movesets from the FireRed/LeafGreen Pokédex
 * and the Generation 3 move pool.
 */
const USE_RANDOM_TEAMS = !false;

// ─── Random team helpers ──────────────────────────────────────────────────────

const NATURE_LIST = Object.values(NATURES);
const STAT_KEYS   = [
  STATS.HP, STATS.ATTACK, STATS.DEFENSE,
  STATS.SPECIAL_ATTACK, STATS.SPECIAL_DEFENSE, STATS.SPEED,
];

/** Returns a random element from an array. */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns n unique elements drawn at random from arr.
 * If arr has fewer than n elements, returns all of them.
 */
function pickUnique(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

/**
 * Filters the Gen 3 move pool to moves that work cleanly in battle:
 *   - Status moves (no power required).
 *   - Damaging moves with a non-null power value.
 *
 * Moves with null power that aren't STATUS (OHKO, Magnitude, etc.) are excluded
 * so every slot either deals straightforward damage or applies an effect.
 */
function buildMovePool() {
  return Moves.getMovesByGameId(GAMES.POKEMON_FIRE_RED).filter(
    m => m.pp > 0 && (m.power !== null || m.category === Moves.MOVE_CATEGORIES.STATUS)
  );
}

/**
 * Builds a single BattlePokemon config:
 * - Random species from the Pokédex.
 * - Four moves drawn without replacement from movePool.
 * - Max IVs, zero EVs, random nature and gender.
 *
 * @param {object[]} allSpecies - All Pokédex entries for the active game.
 * @param {object[]} movePool   - Filtered Generation 3 move list.
 * @param {number}   level
 * @param {number}   pid        - Unique identifier within the team.
 * @return {object}             - Config object accepted by BattlePokemon.
 */
function randomPokemonConfig(allSpecies, movePool, level, pid) {
  const entry = pick(allSpecies);
  const moves = pickUnique(movePool, 4).map(m => ({
    name: m.name,
    pp:   { max: m.pp, current: m.pp },
  }));
  const ivs = Object.fromEntries(STAT_KEYS.map(s => [s, 31]));
  const evs = Object.fromEntries(STAT_KEYS.map(s => [s, 0]));

  return {
    game:    GAMES.POKEMON_FIRE_RED,
    pid,
    species: entry.nat_dex_id,
    level,
    nature:  pick(NATURE_LIST),
    gender:  pick([GENDERS.MALE, GENDERS.FEMALE]),
    ability: { name: 'none' },
    moves,
    ivs,
    evs,
  };
}

/**
 * Returns an array of `size` random Pokémon configs at the given level.
 */
function randomTeam(allSpecies, movePool, size = 3, level = 50) {
  return Array.from({ length: size }, (_, i) =>
    randomPokemonConfig(allSpecies, movePool, level, i + 1)
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export default class extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    Object.keys(Scenes)
      .filter(scene => scene !== 'Preload')
      .forEach(scene => {
        this.scene.add(Scenes[scene].name, Scenes[scene], false);
      });
  }

  create() {
    if (USE_RANDOM_TEAMS) {
      this.randomBattle();
    } else {
      this.battleScene2();
    }
  }

  /**
   * Starts a battle with randomly generated teams.
   * Both sides get 3 Pokémon at level 50 with random species, natures, and movesets.
   * Species are drawn from the FireRed/LeafGreen Pokédex; moves from the Gen 3 pool.
   */
  randomBattle() {
    const dex        = new Pokedex(GAMES.POKEMON_FIRE_RED);
    const allSpecies = Object.values(dex.pokedex);
    const movePool   = buildMovePool();

    const playerTeam = randomTeam(allSpecies, movePool, 3, 50);
    const enemyTeam  = randomTeam(allSpecies, movePool, 3, 50);

    console.log('[Preload] Random battle — player team:',
      playerTeam.map(p => `#${p.species} (${p.moves.map(m => m.name).join(', ')})`));
    console.log('[Preload] Random battle — enemy team:',
      enemyTeam.map(p => `#${p.species} (${p.moves.map(m => m.name).join(', ')})`));

    const RANDOM_WEATHERS = [null, null, 'rain', 'sun', 'sandstorm', 'hail'];
    const randomWeather = RANDOM_WEATHERS[Math.floor(Math.random() * RANDOM_WEATHERS.length)];

    const data = {
      field: { weather: randomWeather, terrain: 'normal' },
      player: {
        name: 'Player',
        team: playerTeam,
        inventory: {
          items: [
            { item: new Items.Potion(),      quantity: 5 },
            { item: new Items.SuperPotion(), quantity: 3 },
            { item: new Items.HyperPotion(), quantity: 2 },
            { item: new Items.MaxPotion(),   quantity: 1 },
            { item: new Items.FullRestore(), quantity: 1 },
            { item: new Items.Ether(),       quantity: 2 },
            { item: new Items.Revive(),      quantity: 2 },
            { item: new Items.RareCandy(),   quantity: 3 },
            { item: new Items.Pokeball(),    quantity: 10 },
            { item: new Items.GreatBall(),   quantity: 5  },
            { item: new Items.UltraBall(),   quantity: 3  },
          ],
          pokeballs: [],
          tms: [],
        },
      },
      enemy: {
        isTrainer: true,
        name: 'Trainer',
        team: enemyTeam,
      },
    };

    this.scene.start('BattleScene2', data);
  }

  /**
   * Starts the hardcoded battle (Bulbasaur/Charmander/Squirtle vs Pikachu).
   * USE_RANDOM_TEAMS must be false to reach this path.
   */
  battleScene2() {
    // 50% chance to be wild pokemon
    const isTrainer = Math.random() < 0.5;

    const data = {
      field: { weather: 'rain', terrain: 'normal' },
      player: {
        name: 'Player',
        team: [
          pokemon['player_bulbasaur'],
          pokemon['player_charmander'],
          pokemon['player_squirtle'],
        ],
        inventory: {
          items: [
            { item: new Items.Potion(),      quantity: 5 },
            { item: new Items.SuperPotion(), quantity: 3 },
            { item: new Items.HyperPotion(), quantity: 2 },
            { item: new Items.MaxPotion(),   quantity: 1 },
            { item: new Items.FullRestore(), quantity: 1 },
            { item: new Items.Ether(),       quantity: 2 },
            { item: new Items.Revive(),      quantity: 2 },
            { item: new Items.RareCandy(),   quantity: 3 },
            { item: new Items.Pokeball(),    quantity: 10 },
            { item: new Items.GreatBall(),   quantity: 5  },
            { item: new Items.UltraBall(),   quantity: 3  },
          ],
          pokeballs: [],
          tms: [],
        },
      },
      enemy: {
        isTrainer,
        name: 'Trainer',
        team: [
          pokemon['trainer_pikachu'],
        ],
      },
    };

    this.scene.start('BattleScene2', data);
  }
}
