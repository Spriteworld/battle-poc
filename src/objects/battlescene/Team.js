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

  /**
   * Set pokemon active in the team.
   * If the pokemon is a number, it will set the active pokemon by index.
   * If the pokemon is an object, it will find the pokemon in the team by its id.
   * 
   * @param {number|object} pokemon - Either an index of the pokemon in the team or a pokemon object. 
   */
  setActivePokemon(pokemon) {
    if (typeof pokemon === 'number') {
      if (pokemon < 0 || pokemon >= this.pokemon.length) {
        console.warn('Invalid index for active Pokemon:', pokemon);
        return;
      }
      this.active = pokemon;
      return;
    }

    if (typeof pokemon === 'object') {
      let index = this.pokemon.findIndex(mon => {
        return mon.id === pokemon.id;
      });

      if (index === -1) {
        console.warn('Pokemon not found in team:', pokemon);
        return;
      }

      this.active = index;
      return;
    }

    console.warn('Invalid type for setting active Pokemon:', typeof pokemon, pokemon);
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
