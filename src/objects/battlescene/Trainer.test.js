jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

jest.mock('@Objects', () => {
  class BattlePokemon {
    constructor(config) {
      this.id = config.id ?? 'mock-uuid';
      this.currentHp = config.currentHp ?? 100;
      this.name = config.name ?? 'Pokemon';
    }
    getName() { return this.name; }
    isAlive() { return this.currentHp > 0; }
  }
  class BattleTeam {
    constructor(team) {
      this.active = 0;
      this.pokemon = team.map(c => new BattlePokemon(c));
    }
    getActivePokemon() { return this.pokemon[this.active]; }
    hasLivingPokemon() { return this.pokemon.some(p => p.isAlive()); }
    findIndex() { return 0; }
  }
  return { BattlePokemon, BattleTeam };
});

import Trainer from './Trainer.js';
import WildTrainer from './WildTrainer.js';

const teamData = [{ name: 'Bulbasaur', currentHp: 100 }];

describe('Trainer', () => {
  test('getName returns the configured name', () => {
    const t = new Trainer({ name: 'Red', team: teamData });
    expect(t.getName()).toBe('Red');
  });

  test('getName returns "Trainer" when name is not set', () => {
    const t = new Trainer({ name: null, team: teamData });
    expect(t.getName()).toBe('Trainer');
  });

  test('isWild is false', () => {
    const t = new Trainer({ name: 'Red', team: teamData });
    expect(t.isWild).toBe(false);
  });

  test('team is a BattleTeam instance', () => {
    const t = new Trainer({ name: 'Red', team: teamData });
    expect(t.team).toBeDefined();
    expect(typeof t.team.getActivePokemon).toBe('function');
  });

  test('gets a unique id', () => {
    const t = new Trainer({ name: 'Red', team: teamData });
    expect(t.id).toBe('mock-uuid');
  });
});

describe('WildTrainer', () => {
  test('isWild is true', () => {
    const t = new WildTrainer({ team: teamData });
    expect(t.isWild).toBe(true);
  });

  test('name is set to "Wild"', () => {
    const t = new WildTrainer({ team: teamData });
    expect(t.name).toBe('Wild');
  });

  test('getName returns the active pokemon name', () => {
    const t = new WildTrainer({ team: teamData });
    expect(t.getName()).toBe('Bulbasaur');
  });
});
