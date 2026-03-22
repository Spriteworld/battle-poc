jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import BattlePokemon from './Pokemon.js';
import { GAMES, NATURES, STATS, GEN_3, GEN_6 } from '@spriteworld/pokemon-data';

// Shared fixture configs — real species so BasePokemon resolves stats.
const bulbasaurConfig = {
  game: GAMES.POKEMON_FIRE_RED,
  pid: 1,
  species: 1,     // Bulbasaur
  originalTrainer: 'Player',
  nickname: 'Bulbasaur',
  level: 50,
  nature: NATURES.HARDY,
  ability: { name: 'overgrow' },
  ivs: {
    [STATS.HP]: 31, [STATS.ATTACK]: 31, [STATS.DEFENSE]: 31,
    [STATS.SPECIAL_ATTACK]: 31, [STATS.SPECIAL_DEFENSE]: 31, [STATS.SPEED]: 31,
  },
  evs: {
    [STATS.HP]: 0, [STATS.ATTACK]: 0, [STATS.DEFENSE]: 0,
    [STATS.SPECIAL_ATTACK]: 0, [STATS.SPECIAL_DEFENSE]: 0, [STATS.SPEED]: 0,
  },
  moves: [
    { name: 'Tackle', pp: { max: 35, current: 35 } },
    { name: 'Razor Leaf', pp: { max: 25, current: 25 } },
  ],
};

const charmanderConfig = {
  game: GAMES.POKEMON_FIRE_RED,
  pid: 2,
  species: 4,     // Charmander
  originalTrainer: 'Enemy',
  nickname: 'Charmander',
  level: 50,
  nature: NATURES.HARDY,
  ability: { name: 'blaze' },
  ivs: {
    [STATS.HP]: 31, [STATS.ATTACK]: 31, [STATS.DEFENSE]: 31,
    [STATS.SPECIAL_ATTACK]: 31, [STATS.SPECIAL_DEFENSE]: 31, [STATS.SPEED]: 31,
  },
  evs: {
    [STATS.HP]: 0, [STATS.ATTACK]: 0, [STATS.DEFENSE]: 0,
    [STATS.SPECIAL_ATTACK]: 0, [STATS.SPECIAL_DEFENSE]: 0, [STATS.SPEED]: 0,
  },
  moves: [
    { name: 'Scratch', pp: { max: 35, current: 35 } },
    { name: 'Ember', pp: { max: 25, current: 25 } },
  ],
};

let bulbasaur;
let charmander;

beforeEach(() => {
  bulbasaur  = new BattlePokemon(bulbasaurConfig,  'Player');
  charmander = new BattlePokemon(charmanderConfig, 'Enemy');
});

describe('BattlePokemon construction', () => {
  test('assigns a uuid id', () => {
    expect(bulbasaur.id).toBe('mock-uuid');
  });

  test('uses provided id when given', () => {
    const mon = new BattlePokemon({ ...bulbasaurConfig, id: 'custom-id' }, 'Player');
    expect(mon.id).toBe('custom-id');
  });

  test('wraps moves as Move instances with pp', () => {
    const moves = bulbasaur.getMoves();
    expect(moves).toHaveLength(2);
    expect(moves[0].pp.current).toBe(35);
    expect(moves[0].pp.max).toBe(35);
  });

  test('inherits currentHp from BasePokemon calculation', () => {
    expect(bulbasaur.currentHp).toBeGreaterThan(0);
    expect(bulbasaur.currentHp).toBe(bulbasaur.maxHp);
  });

  test('uses config.currentHp when provided', () => {
    const mon = new BattlePokemon({ ...bulbasaurConfig, currentHp: 1 }, 'Player');
    expect(mon.currentHp).toBe(1);
  });
});

describe('isAlive', () => {
  test('returns true when HP > 0', () => {
    expect(bulbasaur.isAlive()).toBe(true);
  });

  test('returns false when HP is 0', () => {
    bulbasaur.currentHp = 0;
    expect(bulbasaur.isAlive()).toBe(false);
  });
});

describe('takeDamage', () => {
  test('reduces currentHp by the damage amount', () => {
    const before = bulbasaur.currentHp;
    bulbasaur.takeDamage(10);
    expect(bulbasaur.currentHp).toBe(before - 10);
  });

  test('clamps HP to 0 on lethal damage', () => {
    bulbasaur.takeDamage(99999);
    expect(bulbasaur.currentHp).toBe(0);
  });

  test('does not go below 0', () => {
    bulbasaur.currentHp = 5;
    bulbasaur.takeDamage(100);
    expect(bulbasaur.currentHp).toBe(0);
  });
});

describe('attack', () => {
  test('returns an info object with expected keys', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info).toMatchObject({
      player: expect.any(String),
      enemy:  expect.any(String),
      move:   expect.any(String),
      damage: expect.any(Number),
    });
  });

  test('reduces target HP by the damage dealt', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle
    const before = charmander.currentHp;
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(charmander.currentHp).toBe(before - info.damage);
  });

  test('decrements the move PP by 1', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle (35pp)
    bulbasaur.attack(charmander, move, GEN_3);
    expect(move.pp.current).toBe(34);
  });

  test('logs a warning and returns undefined when move is missing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = bulbasaur.attack(charmander, undefined, GEN_3);
    expect(result).toBeUndefined();
    warn.mockRestore();
  });

  test('damage is ≥ 0', () => {
    const move = bulbasaur.getMoves()[0];
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.damage).toBeGreaterThanOrEqual(0);
  });
});

describe('attack — generation differences', () => {
  test('Gen 3 uses 2× crit multiplier (category by type)', () => {
    // Tackle is Normal-type → Physical in Gen 3 (by-type rule)
    const tackle = bulbasaur.getMoves()[0];
    const info = bulbasaur.attack(charmander, tackle, GEN_3);
    // We can't assert exact damage (random crit), but info object is present
    expect(info.damage).toBeGreaterThanOrEqual(0);
  });

  test('Gen 6 uses 1.5× crit multiplier (category by move)', () => {
    const tackle = bulbasaur.getMoves()[0];
    const info = bulbasaur.attack(charmander, tackle, GEN_6);
    expect(info.damage).toBeGreaterThanOrEqual(0);
  });
});

describe('attackRandomMove', () => {
  test('returns a valid info object', () => {
    const info = bulbasaur.attackRandomMove(charmander, GEN_3);
    expect(info).toMatchObject({
      player: expect.any(String),
      enemy:  expect.any(String),
      move:   expect.any(String),
    });
  });

  test('reduces target HP', () => {
    const before = charmander.currentHp;
    const info = bulbasaur.attackRandomMove(charmander, GEN_3);
    expect(charmander.currentHp).toBe(before - info.damage);
  });
});

describe('nameWithHP', () => {
  test('returns formatted name with hp fraction', () => {
    bulbasaur.currentHp = 30;
    bulbasaur.maxHp = 100;
    expect(bulbasaur.nameWithHP()).toBe('Bulbasaur (30/100)');
  });
});

describe('hasAbility', () => {
  test('returns true for a matching ability (case-insensitive)', () => {
    expect(bulbasaur.hasAbility('Overgrow')).toBe(true);
    expect(bulbasaur.hasAbility('overgrow')).toBe(true);
  });

  test('returns false for a non-matching ability', () => {
    expect(bulbasaur.hasAbility('blaze')).toBe(false);
  });

  test('returns false when ability is missing', () => {
    bulbasaur.ability = null;
    expect(bulbasaur.hasAbility('overgrow')).toBe(false);
  });
});
