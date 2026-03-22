import { STATUS } from '@spriteworld/pokemon-data';
import { MOVE_EFFECTS } from './index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMon(statusOverrides = {}) {
  return {
    getName: () => 'TestMon',
    status: {
      [STATUS.SLEEP]:    0,
      [STATUS.POISON]:   0,
      [STATUS.BURN]:     0,
      [STATUS.FROZEN]:   0,
      [STATUS.PARALYZE]: 0,
      [STATUS.TOXIC]:    0,
      ...statusOverrides,
    },
    modifiers: {},
  };
}

function hitInfo(damage = 10)  { return { damage }; }
function missInfo()            { return { damage: 0 }; }

// ─── Primary status effects ───────────────────────────────────────────────────

describe('thunder wave', () => {
  const effect = MOVE_EFFECTS['thunder wave'];

  test('paralyzes the defender', () => {
    const defender = makeMon();
    effect(makeMon(), defender, missInfo());
    expect(defender.status[STATUS.PARALYZE]).toBe(1);
  });

  test('returns a message containing "paralyzed"', () => {
    const result = effect(makeMon(), makeMon(), missInfo());
    expect(result.message).toContain('paralyzed');
  });

  test('returns null if defender already has a status condition', () => {
    const defender = makeMon({ [STATUS.BURN]: 1 });
    expect(effect(makeMon(), defender, missInfo())).toBeNull();
    expect(defender.status[STATUS.PARALYZE]).toBe(0);
  });
});

describe('toxic', () => {
  const effect = MOVE_EFFECTS['toxic'];

  test('badly poisons the defender', () => {
    const defender = makeMon();
    effect(makeMon(), defender, missInfo());
    expect(defender.status[STATUS.TOXIC]).toBe(1);
  });

  test('returns null if defender already has a status condition', () => {
    const defender = makeMon({ [STATUS.PARALYZE]: 1 });
    expect(effect(makeMon(), defender, missInfo())).toBeNull();
  });
});

describe('will-o-wisp', () => {
  const effect = MOVE_EFFECTS['will-o-wisp'];

  test('burns the defender', () => {
    const defender = makeMon();
    effect(makeMon(), defender, missInfo());
    expect(defender.status[STATUS.BURN]).toBe(1);
  });

  test('sets modifiers.burn for CalcDamage', () => {
    const defender = makeMon();
    effect(makeMon(), defender, missInfo());
    expect(defender.modifiers.burn).toBe(true);
  });
});

// ─── Secondary status effects ─────────────────────────────────────────────────

describe('flamethrower (10% burn)', () => {
  const effect = MOVE_EFFECTS['flamethrower'];

  test('burns defender when damage > 0 and roll succeeds', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05); // 5 < 10 → burn
    const defender = makeMon();
    const result = effect(makeMon(), defender, hitInfo(90));
    expect(defender.status[STATUS.BURN]).toBe(1);
    expect(result.message).toContain('burned');
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('returns null when roll fails', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.15); // 15 >= 10 → miss
    expect(effect(makeMon(), makeMon(), hitInfo(90))).toBeNull();
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('returns null when damage is 0 (type immune)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    expect(effect(makeMon(), makeMon(), missInfo())).toBeNull();
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('returns null if defender already has a status condition', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    const defender = makeMon({ [STATUS.PARALYZE]: 1 });
    expect(effect(makeMon(), defender, hitInfo(90))).toBeNull();
    jest.spyOn(Math, 'random').mockRestore();
  });
});

describe('body slam (30% paralysis)', () => {
  const effect = MOVE_EFFECTS['body slam'];

  test('paralyzes defender at 30% roll', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.25); // 25 < 30 → paralysis
    const defender = makeMon();
    effect(makeMon(), defender, hitInfo(40));
    expect(defender.status[STATUS.PARALYZE]).toBe(1);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('returns null when roll fails', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.35); // 35 >= 30 → no effect
    expect(effect(makeMon(), makeMon(), hitInfo(40))).toBeNull();
    jest.spyOn(Math, 'random').mockRestore();
  });
});

// ─── Registry coverage ────────────────────────────────────────────────────────

describe('MOVE_EFFECTS registry', () => {
  test('all registered entries are functions', () => {
    Object.entries(MOVE_EFFECTS).forEach(([name, fn]) => {
      expect(typeof fn).toBe('function');
    });
  });

  test('returns null for unknown move names', () => {
    expect(MOVE_EFFECTS['hyper beam']).toBeUndefined();
  });
});
