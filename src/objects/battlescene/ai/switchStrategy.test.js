import { GEN_3, Moves, TYPES } from '@spriteworld/pokemon-data';
import { shouldSwitch, __testing } from './switchStrategy.js';

const { matchupScore } = __testing;

function makeMon({ types = [], moves = [], hp = 100, volatileStatus = null, hasAbility } = {}) {
  return {
    currentHp: hp,
    types,
    moves: moves.map(m => ({
      name: m.name ?? 'Tackle',
      type: m.type,
      power: m.power,
      category: m.category ?? Moves.MOVE_CATEGORIES.PHYSICAL,
      pp: { current: m.pp ?? 35, max: 35 },
    })),
    volatileStatus: volatileStatus ?? {},
    hasAbility: hasAbility ?? (() => false),
    getName: () => 'Mon',
  };
}

describe('switchStrategy.matchupScore', () => {
  test('rewards super-effective offence', () => {
    const water = makeMon({ types: [TYPES.WATER], moves: [{ type: TYPES.WATER, power: 80 }] });
    const rock  = makeMon({ types: [TYPES.ROCK] });
    expect(matchupScore(water, rock, GEN_3)).toBeGreaterThan(
      matchupScore(water, makeMon({ types: [TYPES.WATER] }), GEN_3)
    );
  });

  test('punishes super-effective incoming damage', () => {
    const grass = makeMon({ types: [TYPES.GRASS], moves: [{ type: TYPES.NORMAL, power: 40 }] });
    const fire  = makeMon({ types: [TYPES.FIRE], moves: [{ type: TYPES.FIRE, power: 80 }] });
    expect(matchupScore(grass, fire, GEN_3)).toBeLessThan(0);
  });

  test('status-only movesets contribute no offence', () => {
    const statusMon = makeMon({
      types: [TYPES.NORMAL],
      moves: [{ type: TYPES.NORMAL, power: 80, category: Moves.MOVE_CATEGORIES.STATUS }],
    });
    const attackerMon = makeMon({
      types: [TYPES.NORMAL],
      moves: [{ type: TYPES.NORMAL, power: 80 }],
    });
    const target = makeMon({ types: [TYPES.NORMAL] });
    // Status move scores 0 offence; damaging move of the same power scores positive.
    expect(matchupScore(statusMon, target, GEN_3)).toBeLessThan(matchupScore(attackerMon, target, GEN_3));
  });
});

describe('switchStrategy.shouldSwitch', () => {
  const opponent = () => makeMon({ types: [TYPES.FIRE], moves: [{ type: TYPES.FIRE, power: 80 }] });
  const grass    = () => makeMon({ types: [TYPES.GRASS], moves: [{ type: TYPES.GRASS, power: 80 }] });
  const water    = () => makeMon({ types: [TYPES.WATER], moves: [{ type: TYPES.WATER, power: 80 }] });

  test('switches a losing mon for a winning teammate when aggression is high', () => {
    const active = grass();      // vs Fire: x0.5 offence, x2 incoming — very bad
    const bench  = water();      // vs Fire: x2 offence, x0.5 incoming — great
    expect(shouldSwitch(active, opponent(), [active, bench], GEN_3, 1.0)).toBe(bench);
  });

  test('low-aggression AI tolerates modest gaps', () => {
    const active = makeMon({ types: [TYPES.NORMAL], moves: [{ type: TYPES.NORMAL, power: 60 }] });
    const bench  = makeMon({ types: [TYPES.NORMAL], moves: [{ type: TYPES.NORMAL, power: 80 }] });
    expect(shouldSwitch(active, opponent(), [active, bench], GEN_3, 0.3)).toBeNull();
  });

  test('never switches into a losing teammate', () => {
    const active = grass();  // bad
    const bench  = makeMon({ types: [TYPES.GRASS], moves: [{ type: TYPES.GRASS, power: 40 }] }); // also bad
    expect(shouldSwitch(active, opponent(), [active, bench], GEN_3, 1.0)).toBeNull();
  });

  test('skips fainted teammates', () => {
    const active = grass();
    const fainted = { ...water(), currentHp: 0 };
    expect(shouldSwitch(active, opponent(), [active, fainted], GEN_3, 1.0)).toBeNull();
  });

  test('returns null when the active is trapped', () => {
    const active = { ...grass(), volatileStatus: { trapped: { sourceName: 'Wrap' } } };
    const bench  = water();
    expect(shouldSwitch(active, opponent(), [active, bench], GEN_3, 1.0)).toBeNull();
  });

  test('returns null when the active is ingrained', () => {
    const active = { ...grass(), volatileStatus: { ingrained: true } };
    const bench  = water();
    expect(shouldSwitch(active, opponent(), [active, bench], GEN_3, 1.0)).toBeNull();
  });

  test('returns null when there is no bench', () => {
    const active = grass();
    expect(shouldSwitch(active, opponent(), [active], GEN_3, 1.0)).toBeNull();
  });
});
