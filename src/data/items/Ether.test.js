import Ether from './Ether.js';
import { makeMon, makeAction } from './testHelpers.js';

describe('Ether', () => {
  test('getName returns "Ether"', () => {
    expect(new Ether().getName()).toBe('Ether');
  });

  test('restores 10 PP to the move with the lowest PP', () => {
    const tackle = { name: 'Tackle', pp: { current: 5,  max: 35 } };
    const growl  = { name: 'Growl',  pp: { current: 15, max: 40 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle, growl]);
    new Ether().onUse(mon, makeAction());
    expect(tackle.pp.current).toBe(15); // +10
    expect(growl.pp.current).toBe(15);  // unchanged
  });

  test('does not exceed move maxPP', () => {
    const tackle = { name: 'Tackle', pp: { current: 32, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle]);
    new Ether().onUse(mon, makeAction());
    expect(tackle.pp.current).toBe(35);
  });

  test('skips moves already at full PP', () => {
    const full  = { name: 'Tackle', pp: { current: 35, max: 35 } };
    const empty = { name: 'Growl',  pp: { current: 0,  max: 40 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([full, empty]);
    new Ether().onUse(mon, makeAction());
    expect(full.pp.current).toBe(35);  // unchanged
    expect(empty.pp.current).toBe(10); // +10
  });

  test('message indicates full PP when all moves are full', () => {
    const full = { name: 'Tackle', pp: { current: 35, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([full]);
    const result = new Ether().onUse(mon, makeAction());
    expect(result.message).toContain('full PP');
  });

  test('message includes the move name that was restored', () => {
    const tackle = { name: 'Tackle', pp: { current: 5, max: 35 } };
    const mon = makeMon();
    mon.getMoves.mockReturnValue([tackle]);
    const result = new Ether().onUse(mon, makeAction());
    expect(result.message).toContain('Tackle');
  });
});
