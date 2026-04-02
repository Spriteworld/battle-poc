import FullRestore from './FullRestore.js';
import { makeMon, makeAction, makeStatus } from './testHelpers.js';
import { STATUS } from '@spriteworld/pokemon-data';

describe('FullRestore', () => {
  test('getName returns "Full Restore"', () => {
    expect(new FullRestore().getName()).toBe('Full Restore');
  });

  test('fully restores HP', () => {
    const mon = makeMon({ currentHp: 10, maxHp: 100 });
    new FullRestore().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(100);
  });

  test('clears all status conditions', () => {
    const mon = makeMon({
      currentHp: 50,
      status: makeStatus({ [STATUS.BURN]: 1, [STATUS.TOXIC]: 3 }),
      toxicCount: 3,
    });
    new FullRestore().onUse(mon, makeAction());
    expect(Object.values(mon.status).every(v => v === 0)).toBe(true);
    expect(mon.toxicCount).toBe(0);
  });

  test('does not heal a fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0 });
    new FullRestore().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(0);
  });

  test('returns a result when already at full HP', () => {
    const mon = makeMon({ currentHp: 100, maxHp: 100 });
    const result = new FullRestore().onUse(mon, makeAction());
    expect(result).toBeDefined();
    expect(result.message).toBeDefined();
  });

  test('message includes trainer name', () => {
    const mon = makeMon({ currentHp: 50, maxHp: 100 });
    const result = new FullRestore().onUse(mon, makeAction('Blue'));
    expect(result.message).toContain('Blue');
  });
});
