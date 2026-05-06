import Elixir from './Elixir.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('Elixir', () => {
  test('getName returns "Elixir"', () => {
    expect(new Elixir().getName()).toBe('Elixir');
  });

  test('restores 10 PP to all depleted moves', () => {
    const tackle = { name: 'Tackle',     pp: { current: 5,  max: 35 } };
    const growl  = { name: 'Growl',      pp: { current: 10, max: 40 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle, growl]);
    new Elixir().onUse(mon, makeAction());
    expect(tackle.pp.current).toBe(15);
    expect(growl.pp.current).toBe(20);
  });

  test('does not exceed each move\'s maxPP', () => {
    const tackle = { name: 'Tackle', pp: { current: 32, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle]);
    new Elixir().onUse(mon, makeAction());
    expect(tackle.pp.current).toBe(35);
  });

  test('skips moves already at full PP', () => {
    const full  = { name: 'Tackle', pp: { current: 35, max: 35 } };
    const empty = { name: 'Growl',  pp: { current: 0,  max: 40 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([full, empty]);
    new Elixir().onUse(mon, makeAction());
    expect(full.pp.current).toBe(35);
    expect(empty.pp.current).toBe(10);
  });

  test('returns success: false when all moves are at full PP', () => {
    const full = { name: 'Tackle', pp: { current: 35, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([full]);
    const result = new Elixir().onUse(mon, makeAction());
    expect(result.success).toBe(false);
  });

  test('message includes trainer and pokemon name', () => {
    const tackle = { name: 'Tackle', pp: { current: 5, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle]);
    const result = new Elixir().onUse(mon, makeAction('Red'));
    expect(result.message).toContain('Red');
    expect(result.message).toContain('Bulbasaur');
  });
});
