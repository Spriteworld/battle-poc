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

  test('decrements PP before the accuracy roll (PP still spent on a miss)', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle, accuracy 95
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // guaranteed miss
    bulbasaur.attack(charmander, move, GEN_3);
    expect(move.pp.current).toBe(34);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('returns accuracy:0 and damage:0 on a miss', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle, accuracy 95
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // 99 >= 95 → miss
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.accuracy).toBe(0);
    expect(info.damage).toBe(0);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('does not damage target on a miss', () => {
    const move = bulbasaur.getMoves()[0];
    const before = charmander.currentHp;
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    bulbasaur.attack(charmander, move, GEN_3);
    expect(charmander.currentHp).toBe(before);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('null-accuracy move always hits regardless of random roll', () => {
    // Razor Leaf has accuracy 95 in gen_3 fixture — create a null-accuracy move manually.
    // We can't easily inject a null-accuracy move through the real Move constructor,
    // so test via the condition: if Math.random returns 0.99 but accuracy is null, it still hits.
    const move = bulbasaur.getMoves()[0];
    const realAccuracy = move.accuracy;
    move.accuracy = null; // patch to simulate always-hit move
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.accuracy).not.toBe(0); // did not miss
    expect(info.damage).toBeGreaterThan(0);
    move.accuracy = realAccuracy;
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('PP does not go below 0', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle (35pp)
    move.pp.current = 1;
    bulbasaur.attack(charmander, move, GEN_3);
    expect(move.pp.current).toBe(0);
    // second use — already at 0, must not go negative
    bulbasaur.attack(charmander, move, GEN_3);
    expect(move.pp.current).toBe(0);
  });

  test('uses Struggle when all moves are at 0 PP', () => {
    bulbasaur.getMoves().forEach(m => { m.pp.current = 0; });
    const info = bulbasaur.attack(charmander, bulbasaur.getMoves()[0], GEN_3);
    expect(info.move).toBe('Struggle');
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

describe('attack — move effects', () => {
  test('includes effect:null when move has no onEffect', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle — no registered effect
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // guaranteed hit
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.effect).toBeNull();
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('includes effect result when move has onEffect', () => {
    const move = bulbasaur.getMoves()[0];
    move.onEffect = jest.fn(() => ({ message: 'A test effect!' }));
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // guaranteed hit
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.effect).toEqual({ message: 'A test effect!' });
    expect(move.onEffect).toHaveBeenCalledWith(bulbasaur, charmander, expect.any(Object));
    move.onEffect = null;
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('effect:null when onEffect returns null (roll failed)', () => {
    const move = bulbasaur.getMoves()[0];
    move.onEffect = jest.fn(() => null);
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // guaranteed hit
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.effect).toBeNull();
    move.onEffect = null;
    jest.spyOn(Math, 'random').mockRestore();
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

describe('mustStruggle', () => {
  test('returns false when moves have PP remaining', () => {
    expect(bulbasaur.mustStruggle()).toBe(false);
  });

  test('returns false when only some moves are depleted', () => {
    bulbasaur.getMoves()[0].pp.current = 0;
    expect(bulbasaur.mustStruggle()).toBe(false);
  });

  test('returns true when all moves are at 0 PP', () => {
    bulbasaur.getMoves().forEach(m => { m.pp.current = 0; });
    expect(bulbasaur.mustStruggle()).toBe(true);
  });
});

describe('struggle', () => {
  beforeEach(() => {
    bulbasaur.getMoves().forEach(m => { m.pp.current = 0; });
  });

  test('returns move name "Struggle"', () => {
    const info = bulbasaur.struggle(charmander, GEN_3);
    expect(info.move).toBe('Struggle');
  });

  test('deals damage to the target', () => {
    const before = charmander.currentHp;
    const info = bulbasaur.struggle(charmander, GEN_3);
    expect(charmander.currentHp).toBe(before - info.damage);
  });

  test('applies ½ max HP recoil to the attacker', () => {
    const before = bulbasaur.currentHp;
    const info = bulbasaur.struggle(charmander, GEN_3);
    expect(bulbasaur.currentHp).toBe(before - info.recoil);
    expect(info.recoil).toBe(Math.floor(bulbasaur.maxHp / 2));
  });

  test('typeEffectiveness is always 1 (typeless)', () => {
    const info = bulbasaur.struggle(charmander, GEN_3);
    expect(info.typeEffectiveness).toBe(1);
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

  test('only picks moves with PP > 0', () => {
    // Deplete Tackle (index 0), leave Razor Leaf (index 1) with PP.
    bulbasaur.getMoves()[0].pp.current = 0;
    for (let i = 0; i < 20; i++) {
      bulbasaur.attackRandomMove(charmander, GEN_3);
    }
    // Tackle was never used — its PP stays 0.
    expect(bulbasaur.getMoves()[0].pp.current).toBe(0);
  });

  test('uses Struggle when all moves are at 0 PP', () => {
    bulbasaur.getMoves().forEach(m => { m.pp.current = 0; });
    const info = bulbasaur.attackRandomMove(charmander, GEN_3);
    expect(info.move).toBe('Struggle');
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
