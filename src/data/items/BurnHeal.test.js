import BurnHeal from './BurnHeal.js';
import { makeMon, makeAction, makeStatus } from './testHelpers.js';
import { STATUS } from '@spriteworld/pokemon-data';

describe('BurnHeal', () => {
  test('getName returns "Burn Heal"', () => {
    expect(new BurnHeal().getName()).toBe('Burn Heal');
  });

  test('cures a burn', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.BURN]: 1 }) });
    new BurnHeal().onUse(mon, makeAction());
    expect(mon.status[STATUS.BURN]).toBe(0);
  });

  test('returns success: false when not burned', () => {
    const mon = makeMon();
    const result = new BurnHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('returns success: false on fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, status: makeStatus({ [STATUS.BURN]: 1 }) });
    const result = new BurnHeal().onUse(mon, makeAction());
    expect(result.success).toBe(false);
    expect(mon.status[STATUS.BURN]).toBe(1);
  });

  test('does not clear unrelated status conditions', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.BURN]: 1, [STATUS.PARALYZE]: 1 }) });
    new BurnHeal().onUse(mon, makeAction());
    expect(mon.status[STATUS.PARALYZE]).toBe(1);
  });

  test('message includes trainer and pokemon name', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.BURN]: 1 }) });
    const result = new BurnHeal().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
