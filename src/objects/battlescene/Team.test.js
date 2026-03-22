jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

// Minimal BattlePokemon stand-in — avoids loading the full data package
// while still exercising all BattleTeam logic.
jest.mock('@Objects', () => {
  class BattlePokemon {
    constructor(config) {
      this.id = config.id ?? 'mock-uuid';
      this.currentHp = config.currentHp ?? 100;
      this.maxHp = config.maxHp ?? 100;
      this.name = config.name ?? 'Pokemon';
    }
    getName() { return this.name; }
    isAlive() { return this.currentHp > 0; }
  }
  return { BattlePokemon };
});

import BattleTeam from './Team.js';

const makeMon = (overrides = {}) => ({ id: 'uuid-' + Math.random(), currentHp: 100, maxHp: 100, name: 'Mon', ...overrides });

describe('BattleTeam', () => {
  describe('construction', () => {
    test('wraps raw configs in BattlePokemon instances', () => {
      const team = new BattleTeam([makeMon(), makeMon()], 'Player');
      expect(team.pokemon).toHaveLength(2);
    });

    test('active defaults to index 0', () => {
      const team = new BattleTeam([makeMon({ name: 'Bulbasaur' })], 'Player');
      expect(team.active).toBe(0);
    });
  });

  describe('getActivePokemon', () => {
    test('returns the pokemon at the active index', () => {
      const team = new BattleTeam([makeMon({ name: 'A' }), makeMon({ name: 'B' })], 'Player');
      expect(team.getActivePokemon().name).toBe('A');
    });
  });

  describe('setActivePokemon', () => {
    test('sets active by numeric index', () => {
      const team = new BattleTeam([makeMon({ name: 'A' }), makeMon({ name: 'B' })], 'Player');
      team.setActivePokemon(1);
      expect(team.active).toBe(1);
      expect(team.getActivePokemon().name).toBe('B');
    });

    test('warns and does not change active for out-of-bounds index', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const team = new BattleTeam([makeMon()], 'Player');
      team.setActivePokemon(99);
      expect(team.active).toBe(0);
      warn.mockRestore();
    });

    test('sets active by pokemon object (matched by id)', () => {
      const a = makeMon({ id: 'id-a', name: 'A' });
      const b = makeMon({ id: 'id-b', name: 'B' });
      const team = new BattleTeam([a, b], 'Player');
      const bMon = team.pokemon[1];
      team.setActivePokemon(bMon);
      expect(team.active).toBe(1);
    });

    test('warns when pokemon object is not in the team', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const team = new BattleTeam([makeMon({ id: 'id-a' })], 'Player');
      team.setActivePokemon({ id: 'not-in-team' });
      expect(team.active).toBe(0);
      warn.mockRestore();
    });
  });

  describe('hasLivingPokemon', () => {
    test('returns true when at least one pokemon is alive', () => {
      const team = new BattleTeam([makeMon({ currentHp: 0 }), makeMon({ currentHp: 50 })], 'Player');
      expect(team.hasLivingPokemon()).toBe(true);
    });

    test('returns false when all pokemon have fainted', () => {
      const team = new BattleTeam([makeMon({ currentHp: 0 }), makeMon({ currentHp: 0 })], 'Player');
      expect(team.hasLivingPokemon()).toBe(false);
    });
  });

  describe('getFirstAlive', () => {
    test('returns the first pokemon with HP > 0', () => {
      const team = new BattleTeam(
        [makeMon({ name: 'Fainted', currentHp: 0 }), makeMon({ name: 'Alive', currentHp: 50 })],
        'Player'
      );
      expect(team.getFirstAlive().name).toBe('Alive');
    });
  });

  describe('switchToNextLivingPokemon', () => {
    test('switches active to the first living pokemon', () => {
      const team = new BattleTeam(
        [makeMon({ currentHp: 0 }), makeMon({ currentHp: 50 })],
        'Player'
      );
      const result = team.switchToNextLivingPokemon();
      expect(result).toBe(true);
      expect(team.active).toBe(1);
    });

    test('returns false and warns when no living pokemon remain', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const team = new BattleTeam([makeMon({ currentHp: 0 })], 'Player');
      const result = team.switchToNextLivingPokemon();
      expect(result).toBe(false);
      warn.mockRestore();
    });
  });
});
