import Phaser from 'phaser';
import Scenes from '@Scenes';
import * as pokemon from '@Data/pokemon/';
import Items from '@Data/items/';

export default class extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload () {
    // this.load.scripts('inspector', [
    //   'https://cdn.jsdelivr.net/npm/tweakpane@3.0.5',
    //   'https://cdn.jsdelivr.net/npm/phaser-plugin-inspector@1.0.1',
    // ]);
    // this.load.once('complete', () => {
    //   PhaserPluginInspector.Install(this.plugins);
    // });

    Object.keys(Scenes)
      .filter(scene => scene !== 'Preload')
      .forEach((scene) => {
        this.scene.add(Scenes[scene].name, Scenes[scene], false);
      })
    ;
  }

  create () {
    this.battleScene2();
  }

  battleScene1() {
    let keys = Object.keys(pokemon);

    // randomly select a Pokémon
    let pokemon1 = Math.floor(Math.random() * keys.length);
    console.log('[Preload][Pokemon1]', pokemon1, pokemon[keys[pokemon1]]);
    let pokemon2 = Math.floor(Math.random() * keys.length);
    console.log('[Preload][Pokemon2]', pokemon2, pokemon[keys[pokemon2]]);

    let data = {
      player: {
        name: 'Player',
        team: [pokemon[keys[pokemon1]]]
      },
      enemy: {
        name: 'Wild',
        team: [pokemon[keys[pokemon2]]]
      }
    };

    console.log('[Preload][BattleData]', data);
    this.scene.start('BattleScene', data);
  }

  battleScene2() {
    this.config = {};
    this.config.field = {};

    this.config.player = {};
    this.config.player.team = [];

    this.config.enemy = {};
    this.config.enemy.team = [];
    this.config.hasData = false;

    // 50% chance to be wild pokemon
    let isTrainer = (Math.random() < 0.5);

    let data = {
      field: {
        weather: 'clear',
        terrain: 'normal',
      },
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
          ],
          pokeballs: [],
          tms: [],
        },
      },
      enemy: {
        isTrainer: isTrainer,
        name: 'Trainer',
        team: [
          pokemon['trainer_pikachu'],
        ],
      }
    };

    this.scene.start('BattleScene2', data);
  }
}
