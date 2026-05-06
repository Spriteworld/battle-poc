import { STATUS } from '@spriteworld/pokemon-data';

/** Returns a fresh status object with all conditions inactive (value 0). */
export function makeStatus(overrides = {}) {
  return {
    [STATUS.SLEEP]:    0,
    [STATUS.POISON]:   0,
    [STATUS.BURN]:     0,
    [STATUS.FROZEN]:   0,
    [STATUS.PARALYZE]: 0,
    [STATUS.TOXIC]:    0,
    ...overrides,
  };
}

export function makeMon(overrides = {}) {
  return {
    currentHp:  50,
    maxHp:      100,
    status:     makeStatus(),
    toxicCount: 0,
    getName:    jest.fn(() => 'Bulbasaur'),
    getMoves:   jest.fn(() => [
      { name: 'Tackle',     pp: { current: 10, max: 35 } },
      { name: 'Razor Leaf', pp: { current: 25, max: 25 } },
    ]),
    ...overrides,
  };
}

export function makeAction(playerName = 'Red') {
  return { player: { getName: jest.fn(() => playerName) } };
}
