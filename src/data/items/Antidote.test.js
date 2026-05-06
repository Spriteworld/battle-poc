import Antidote from './Antidote.js';
import { makeMon, makeAction, makeStatus } from './testHelpers.js';
import { STATUS } from '@spriteworld/pokemon-data';

describe('Antidote', () => {
  test('getName returns "Antidote"', () => {
    expect(new Antidote().getName()).toBe('Antidote');
  });

  test('cures poison', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.POISON]: 1 }) });
    new Antidote().onUse(mon, makeAction());
    expect(mon.status[STATUS.POISON]).toBe(0);
  });

  test('cures bad poison (Toxic) and resets toxicCount', () => {
    const mon = makeMon({
      status: makeStatus({ [STATUS.TOXIC]: 4 }),
      toxicCount: 4,
    });
    new Antidote().onUse(mon, makeAction());
    expect(mon.status[STATUS.TOXIC]).toBe(0);
    expect(mon.toxicCount).toBe(0);
  });

  test('returns success: false when not poisoned', () => {
    const mon = makeMon();
    const result = new Antidote().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('returns success: false on fainted pokemon', () => {
    const mon = makeMon({ currentHp: 0, status: makeStatus({ [STATUS.POISON]: 1 }) });
    const result = new Antidote().onUse(mon, makeAction());
    expect(result.success).toBe(false);
    expect(mon.status[STATUS.POISON]).toBe(1);
  });

  test('does not clear unrelated status conditions', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.POISON]: 1, [STATUS.BURN]: 1 }) });
    new Antidote().onUse(mon, makeAction());
    expect(mon.status[STATUS.BURN]).toBe(1);
  });

  test('message includes trainer and pokemon name', () => {
    const mon = makeMon({ status: makeStatus({ [STATUS.POISON]: 1 }) });
    const result = new Antidote().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
