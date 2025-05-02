import Phaser from 'phaser';
import * as pokemon from '@Data/pokemon/';

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
  }

  create () {
    let data = {
      player: {
        name: 'Player',
        team: [pokemon.player_bulbasaur]
      },
      enemy: {
        name: 'Wild',
        team: [pokemon.wild_rattata]
      }
    };

    console.log('[Preload][BattleData]', data);
    this.scene.start('BattleScene', data);
  }
}
