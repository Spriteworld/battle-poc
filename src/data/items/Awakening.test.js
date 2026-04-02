import Awakening from './Awakening.js';
import { makeMon, makeAction, makeStatus } from './testHelpers.js';
import { STATUS } from '@spriteworld/pokemon-data';

describe('Awakening', () => {
  test('getName returns "Awakening"', () => {
    expect(new Awakening().getName()).toBe('Awakening');
  });

  test('wakes a sleeping pokemon', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.SLEEP]: 2 }) });
    new Awakening().onUse(mon, makeAction());
    expect(mon.status[STATUS.SLEEP]).toBe(0);
  });

  test('returns success: false when not asleep', () => {
    const mon = makeMon();
    const result = new Awakening().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('returns success: false on fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, status: makeStatus({ [STATUS.SLEEP]: 2 }) });
    const result = new Awakening().onUse(mon, makeAction());
    expect(result.success).toBe(false);
    expect(mon.status[STATUS.SLEEP]).toBe(2);
  });

  test('message includes trainer and pokemon name', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.SLEEP]: 1 }) });
    const result = new Awakening().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
