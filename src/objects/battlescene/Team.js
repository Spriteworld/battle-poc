import { BattlePokemon } from '@Objects';

export default class {
  constructor(team, trainerName) {
    this.active = 0;
    this.pokemon = team.map(mon => {
      return new BattlePokemon(mon, trainerName);
    });
  }

  getFirstAlive() {
    let idx = this.pokemon.findIndex(mon => {
      return mon.currentHp > 0;
    });

    return this.pokemon[idx];
  }

  hasLivingPokemon() {
    return this.pokemon.some(mon => {
      return mon.currentHp > 0;
    });
  }

  getActivePokemon() {
    return this.pokemon[this.active];
  }

  setActivePokemon(index) {
    if (index < 0 || index >= this.pokemon.length) {
      console.warn('Invalid index for active Pokemon:', index);
      return;
    }
    this.active = index;
  }

  switchToNextLivingPokemon() {
    this.active = this.pokemon.findIndex(mon => {
      return mon.currentHp > 0;
    });
    if (this.active === -1) {
      console.warn('No living Pokemon found to switch to.');
      return false;
    }
    return true;
  }

  debug() {
    console.log('BATTLETEAM');
    console.log(this);
  }
}
