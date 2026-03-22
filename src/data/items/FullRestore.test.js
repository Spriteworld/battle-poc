import FullRestore from './FullRestore.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('FullRestore', () => {
  test('getName returns "Full Restore"', () => {
    expect(new FullRestore().getName()).toBe('Full Restore');
  });

  test('fully restores HP', () => {
    const mon = makeMon({ currentHp: 10, maxHp: 100 });
    new FullRestore().onUse(mon, makeAction());
    expect(mon.currentHp).toBe(100);
  });

  test('clears status condition', () => {
    const mon = makeMon({ currentHp: 50, status: 'poison' });
    new FullRestore().onUse(mon, makeAction());
    expect(mon.status).toBeNull();
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
});
