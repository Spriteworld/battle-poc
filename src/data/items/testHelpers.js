export function makeMon(overrides = {}) {
  return {
    currentHp: 50,
    maxHp:     100,
    status:    null,
    getName:   jest.fn(() => 'Bulbasaur'),
    getMoves:  jest.fn(() => [
      { name: 'Tackle',     pp: { current: 10, max: 35 } },
      { name: 'Razor Leaf', pp: { current: 25, max: 25 } },
    ]),
    ...overrides,
  };
}

export function makeAction(playerName = 'Red') {
  return { player: { getName: jest.fn(() => playerName) } };
}
