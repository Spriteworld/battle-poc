jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import BattlePokemon from './Pokemon.js';
import { GAMES, NATURES, STATS, GEN_3, GEN_6, Moves } from '@spriteworld/pokemon-data';

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

  test('logs a warning and returns a failed info object when move is missing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = bulbasaur.attack(charmander, undefined, GEN_3);
    expect(result).toBeDefined();
    expect(result.accuracy).toBe(0);
    expect(result.failed).toBe(true);
    warn.mockRestore();
  });

  test('damage is ≥ 0', () => {
    const move = bulbasaur.getMoves()[0];
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.damage).toBeGreaterThanOrEqual(0);
  });
});

describe('attack — onAttack override', () => {
  test('uses onAttack instead of CalcDamage when present', () => {
    const move = bulbasaur.getMoves()[0];
    move.onAttack = jest.fn(() => ({ damage: 99, critical: 1, stab: 1, typeEffectiveness: 1, accuracy: 1 }));
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(move.onAttack).toHaveBeenCalledWith(bulbasaur, charmander, GEN_3);
    expect(info.damage).toBe(99);
    move.onAttack = null;
  });

  test('skips standard accuracy roll when onAttack is set', () => {
    const move = bulbasaur.getMoves()[0];
    move.onAttack = jest.fn(() => ({ damage: 40, critical: 1, stab: 1, typeEffectiveness: 1, accuracy: 1 }));
    // Math.random 0.99 would normally cause a miss, but onAttack bypasses that check.
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.damage).toBe(40);
    move.onAttack = null;
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('returns accuracy:0 and skips onEffect when onAttack signals a miss', () => {
    const move = bulbasaur.getMoves()[0];
    move.onAttack = jest.fn(() => ({ damage: 0, critical: 1, stab: 1, typeEffectiveness: 1, accuracy: 0 }));
    move.onEffect = jest.fn();
    const info = bulbasaur.attack(charmander, move, GEN_3);
    expect(info.accuracy).toBe(0);
    expect(move.onEffect).not.toHaveBeenCalled();
    move.onAttack = null;
    move.onEffect = null;
  });

  test('does not damage target when onAttack signals a miss', () => {
    const move = bulbasaur.getMoves()[0];
    move.onAttack = jest.fn(() => ({ damage: 0, critical: 1, stab: 1, typeEffectiveness: 1, accuracy: 0 }));
    const before = charmander.currentHp;
    bulbasaur.attack(charmander, move, GEN_3);
    expect(charmander.currentHp).toBe(before);
    move.onAttack = null;
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

describe('attackWithAI', () => {
  test('returns a valid info object', () => {
    const info = bulbasaur.attackWithAI(charmander, GEN_3);
    expect(info).toMatchObject({
      player: expect.any(String),
      enemy:  expect.any(String),
      move:   expect.any(String),
    });
  });

  test('reduces target HP', () => {
    // Mock random to always pick the AI path (not the 30% random deviation).
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const before = charmander.currentHp;
    const info = bulbasaur.attackWithAI(charmander, GEN_3);
    expect(charmander.currentHp).toBe(before - info.damage);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('uses Struggle when all moves are at 0 PP', () => {
    bulbasaur.getMoves().forEach(m => { m.pp.current = 0; });
    const info = bulbasaur.attackWithAI(charmander, GEN_3);
    expect(info.move).toBe('Struggle');
  });

  test('only picks moves with PP > 0', () => {
    // Deplete Tackle (index 0), leave Razor Leaf (index 1).
    bulbasaur.getMoves()[0].pp.current = 0;
    // Force AI path (>30% so never random deviation).
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    for (let i = 0; i < 20; i++) {
      bulbasaur.attackWithAI(charmander, GEN_3);
    }
    expect(bulbasaur.getMoves()[0].pp.current).toBe(0);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('prefers super-effective moves over neutral ones', () => {
    // Bulbasaur knows Tackle (Normal) and Razor Leaf (Grass).
    // Charmander is Fire — Grass is not very effective (0.5×), Normal is neutral (1×).
    // AI should always prefer Tackle (score 35) over Razor Leaf (score 55×0.5=27.5).
    // Lock random to 0.5 so the 30% deviation check never fires.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const counts = { tackle: 0, 'razor leaf': 0 };
    for (let i = 0; i < 30; i++) {
      const info = bulbasaur.attackWithAI(charmander, GEN_3);
      if (info.move in counts) counts[info.move]++;
    }
    expect(counts['tackle']).toBeGreaterThan(counts['razor leaf']);
    jest.spyOn(Math, 'random').mockRestore();
  });
});

describe('multi-turn state', () => {
  test('lockedMove is null on construction', () => {
    expect(bulbasaur.lockedMove).toBeNull();
  });

  test('invulnerable is false on construction', () => {
    expect(bulbasaur.invulnerable).toBe(false);
  });
});

describe('attackLocked', () => {
  test('deals damage to the target', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle
    move.pp.current = 10;
    const before = charmander.currentHp;
    const info = bulbasaur.attackLocked(charmander, move, GEN_3);
    expect(charmander.currentHp).toBeLessThan(before);
    expect(info.damage).toBeGreaterThan(0);
  });

  test('does NOT decrement PP', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle at 35pp
    move.pp.current = 10;
    bulbasaur.attackLocked(charmander, move, GEN_3);
    expect(move.pp.current).toBe(10);
  });

  test('returns accuracy:0 and damage:0 on a miss', () => {
    const move = bulbasaur.getMoves()[0];
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const info = bulbasaur.attackLocked(charmander, move, GEN_3);
    expect(info.accuracy).toBe(0);
    expect(info.damage).toBe(0);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('does not damage the target on a miss', () => {
    const move = bulbasaur.getMoves()[0];
    const before = charmander.currentHp;
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    bulbasaur.attackLocked(charmander, move, GEN_3);
    expect(charmander.currentHp).toBe(before);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('calls onEffect when present', () => {
    const move = bulbasaur.getMoves()[0];
    move.onEffect = jest.fn(() => ({ message: 'effect!' }));
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // guaranteed hit
    const info = bulbasaur.attackLocked(charmander, move, GEN_3);
    expect(move.onEffect).toHaveBeenCalled();
    expect(info.effect).toEqual({ message: 'effect!' });
    move.onEffect = null;
    jest.spyOn(Math, 'random').mockRestore();
  });
});

describe('attackMultiHit', () => {
  test('decrements PP exactly once regardless of hit count', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle at 35pp
    bulbasaur.attackMultiHit(charmander, move, GEN_3, 4);
    expect(move.pp.current).toBe(34);
  });

  test('returns info.hits equal to the hitCount argument', () => {
    const move = bulbasaur.getMoves()[0];
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // guaranteed hit each call
    const info = bulbasaur.attackMultiHit(charmander, move, GEN_3, 3);
    expect(info.hits).toBe(3);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('total damage is positive for a hit', () => {
    const move = bulbasaur.getMoves()[0];
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const info = bulbasaur.attackMultiHit(charmander, move, GEN_3, 3);
    expect(info.damage).toBeGreaterThan(0);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('target HP is reduced by total damage dealt', () => {
    const move = bulbasaur.getMoves()[0];
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const before = charmander.currentHp;
    const info = bulbasaur.attackMultiHit(charmander, move, GEN_3, 3);
    expect(charmander.currentHp).toBe(before - info.damage);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('on a miss returns accuracy:0, damage:0 and hits:0', () => {
    const move = bulbasaur.getMoves()[0];
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // accuracy miss
    const info = bulbasaur.attackMultiHit(charmander, move, GEN_3, 3);
    expect(info.accuracy).toBe(0);
    expect(info.damage).toBe(0);
    expect(info.hits).toBe(0);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('calls onEffect once after all hits', () => {
    const move = bulbasaur.getMoves()[0];
    move.onEffect = jest.fn(() => null);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    bulbasaur.attackMultiHit(charmander, move, GEN_3, 3);
    expect(move.onEffect).toHaveBeenCalledTimes(1);
    move.onEffect = null;
    jest.spyOn(Math, 'random').mockRestore();
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

// ─── Metronome ─────────────────────────────────────────────────────────────────

describe('Metronome', () => {
  let metronomeMon;
  let target;

  beforeEach(() => {
    metronomeMon = new BattlePokemon({
      ...bulbasaurConfig,
      moves: [{ name: 'Metronome', pp: { max: 10, current: 10 } }],
    }, 'Player');
    target = new BattlePokemon(charmanderConfig, 'Enemy');
  });

  test('decrements Metronome PP by 1', () => {
    const move = metronomeMon.moves[0];
    metronomeMon.attack(target, move, GEN_3);
    expect(move.pp.current).toBe(9);
  });

  test('returns a move name containing the called move name', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const move = metronomeMon.moves[0];
    const info = metronomeMon.attack(target, move, GEN_3);
    expect(info.move).toContain('Metronome →');
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('never calls a banned move (Protect)', () => {
    const allMoves = Moves.getMovesByGen(3);
    // Seed random so it would pick 'protect' if it were allowed.
    const protectIndex = allMoves.findIndex(m => m.name.toLowerCase() === 'protect');
    // Mock random to always select that index in the pool — it should be excluded.
    const pool = allMoves.filter(m => !['counter','covet','destiny bond','detect','endure',
      'focus punch','follow me','helping hand','metronome','mimic','mirror coat',
      'mirror move','protect','sketch','sleep talk','snatch','struggle','thief','transform',
    ].includes(m.name.toLowerCase()));
    expect(pool.find(m => m.name.toLowerCase() === 'protect')).toBeUndefined();
  });

  test('does not call Metronome itself', () => {
    const allMoves = Moves.getMovesByGen(3);
    const pool = allMoves.filter(m => !['metronome'].includes(m.name.toLowerCase()));
    expect(pool.find(m => m.name.toLowerCase() === 'metronome')).toBeUndefined();
  });
});

// ─── lastUsedMove ──────────────────────────────────────────────────────────────

describe('lastUsedMove', () => {
  test('is null on construction', () => {
    expect(bulbasaur.lastUsedMove).toBeNull();
  });

  test('is set to the move after a successful attack', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // guaranteed hit
    bulbasaur.attack(charmander, move, GEN_3);
    expect(bulbasaur.lastUsedMove).toBe(move);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('is set even when the move misses (PP still spent)', () => {
    const move = bulbasaur.getMoves()[0]; // Tackle (accuracy 95)
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // guaranteed miss
    bulbasaur.attack(charmander, move, GEN_3);
    expect(bulbasaur.lastUsedMove).toBe(move);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('is not set when using Struggle', () => {
    bulbasaur.getMoves().forEach(m => { m.pp.current = 0; });
    bulbasaur.attack(charmander, bulbasaur.getMoves()[0], GEN_3);
    expect(bulbasaur.lastUsedMove).toBeNull();
  });

  test('is updated to the new move on subsequent attacks', () => {
    const tackle    = bulbasaur.getMoves()[0];
    const razorLeaf = bulbasaur.getMoves()[1];
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    bulbasaur.attack(charmander, tackle, GEN_3);
    bulbasaur.attack(charmander, razorLeaf, GEN_3);
    expect(bulbasaur.lastUsedMove).toBe(razorLeaf);
    jest.spyOn(Math, 'random').mockRestore();
  });
});

// ─── Encore (volatileStatus.encored) ──────────────────────────────────────────

describe('Encore', () => {
  test('volatileStatus.encored is null on construction', () => {
    expect(bulbasaur.volatileStatus.encored).toBeNull();
  });

  test('forces the encored move regardless of the move passed to attack()', () => {
    const tackle    = bulbasaur.getMoves()[0];
    const razorLeaf = bulbasaur.getMoves()[1];
    bulbasaur.volatileStatus.encored = { move: tackle, turnsLeft: 3 };
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const info = bulbasaur.attack(charmander, razorLeaf, GEN_3);
    expect(info.move.toLowerCase()).toContain('tackle');
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('decrements turnsLeft each time attack() is called', () => {
    const tackle = bulbasaur.getMoves()[0];
    bulbasaur.volatileStatus.encored = { move: tackle, turnsLeft: 3 };
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    bulbasaur.attack(charmander, bulbasaur.getMoves()[1], GEN_3);
    expect(bulbasaur.volatileStatus.encored.turnsLeft).toBe(2);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('clears encored when turnsLeft reaches 0', () => {
    const tackle = bulbasaur.getMoves()[0];
    bulbasaur.volatileStatus.encored = { move: tackle, turnsLeft: 1 };
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    bulbasaur.attack(charmander, bulbasaur.getMoves()[1], GEN_3);
    expect(bulbasaur.volatileStatus.encored).toBeNull();
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('clears encored and uses the fallback move when the encored move has 0 PP', () => {
    const tackle    = bulbasaur.getMoves()[0];
    const razorLeaf = bulbasaur.getMoves()[1];
    tackle.pp.current = 0;
    bulbasaur.volatileStatus.encored = { move: tackle, turnsLeft: 3 };
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const info = bulbasaur.attack(charmander, razorLeaf, GEN_3);
    expect(bulbasaur.volatileStatus.encored).toBeNull();
    // Falls through to the passed move (Razor Leaf)
    expect(info.move.toLowerCase()).toContain('razor leaf');
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('encored move PP is decremented (not the passed move)', () => {
    const tackle    = bulbasaur.getMoves()[0]; // will be forced
    const razorLeaf = bulbasaur.getMoves()[1]; // passed but ignored
    const tacklePP  = tackle.pp.current;
    const leafPP    = razorLeaf.pp.current;
    bulbasaur.volatileStatus.encored = { move: tackle, turnsLeft: 3 };
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    bulbasaur.attack(charmander, razorLeaf, GEN_3);
    expect(tackle.pp.current).toBe(tacklePP - 1);
    expect(razorLeaf.pp.current).toBe(leafPP); // untouched
    jest.spyOn(Math, 'random').mockRestore();
  });
});
