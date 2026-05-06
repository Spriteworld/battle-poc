import MaxElixir from './MaxElixir.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('MaxElixir', () => {
  test('getName returns "Max Elixir"', () => {
    expect(new MaxElixir().getName()).toBe('Max Elixir');
  });

  test('fully restores PP on all depleted moves', () => {
    const tackle = { name: 'Tackle', pp: { current: 5,  max: 35 } };
    const growl  = { name: 'Growl',  pp: { current: 0,  max: 40 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle, growl]);
    new MaxElixir().onUse(mon, makeAction());
    expect(tackle.pp.current).toBe(35);
    expect(growl.pp.current).toBe(40);
  });

  test('does not alter moves already at full PP', () => {
    const full   = { name: 'Tackle', pp: { current: 35, max: 35 } };
    const empty  = { name: 'Growl',  pp: { current: 0,  max: 40 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([full, empty]);
    new MaxElixir().onUse(mon, makeAction());
    expect(full.pp.current).toBe(35);
    expect(empty.pp.current).toBe(40);
  });

  test('returns success: false when all moves are at full PP', () => {
    const full = { name: 'Tackle', pp: { current: 35, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([full]);
    const result = new MaxElixir().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('message includes trainer and pokemon name', () => {
    const tackle = { name: 'Tackle', pp: { current: 5, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle]);
    const result = new MaxElixir().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
