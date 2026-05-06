import MaxEther from './MaxEther.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('MaxEther', () => {
  test('getName returns "Max Ether"', () => {
    expect(new MaxEther().getName()).toBe('Max Ether');
  });

  test('restores the lowest-PP move to full PP', () => {
    const tackle = { name: 'Tackle', pp: { current: 5,  max: 35 } };
    const growl  = { name: 'Growl',  pp: { current: 20, max: 40 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle, growl]);
    new MaxEther().onUse(mon, makeAction());
    expect(tackle.pp.current).toBe(35);
    expect(growl.pp.current).toBe(20); // unchanged
  });

  test('restores exactly to max (not above)', () => {
    const tackle = { name: 'Tackle', pp: { current: 33, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle]);
    new MaxEther().onUse(mon, makeAction());
    expect(tackle.pp.current).toBe(35);
  });

  test('returns success: false when all moves are at full PP', () => {
    const full = { name: 'Tackle', pp: { current: 35, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([full]);
    const result = new MaxEther().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('message includes the move name that was restored', () => {
    const tackle = { name: 'Tackle', pp: { current: 5, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle]);
    const result = new MaxEther().onUse(mon, makeAction());
    expect(result.message).toContain('Tackle');
  });
});
