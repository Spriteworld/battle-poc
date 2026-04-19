jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

jest.mock('@spriteworld/pokemon-data', () => {
  const GROWTH = { MEDIUM_FAST: 'mediumFast' };
  const GAMES  = { POKEMON_FIRE_RED: 'fr' };
  const EVOLUTION_METHOD = { LEVEL: 'level', LEVEL_MALE: 'level-male', LEVEL_FEMALE: 'level-female' };

  // Learnset for Bulbasaur: learns "Razor Leaf" at level 20
  const FRLG_LEARNSETS = { BULBASAUR: [[20, 'Razor Leaf']] };

  // Minimal exp table: index = level-1, value = cumulative exp to reach that level
  const EXPERIENCE_TABLES = {
    mediumFast: [0, 0, 8, 27, 64, 125, 216, 343, 512, 729, 1000,
      1331, 1728, 2197, 2744, 3375, 4096, 4913, 5832, 6859, 8000],
  };

  return {
    GROWTH,
    GAMES,
    EVOLUTION_METHOD,
    FRLG_LEARNSETS,
    EXPERIENCE_TABLES,
    GEN_1_EVOLUTIONS: {},
    GEN_2_EVOLUTIONS: {},
    GEN_3_EVOLUTIONS: {},
    // Return level directly from exp (simplified: exp >= 8000 → level 20)
    calcLevel: jest.fn((_growth, exp) => (exp >= 8000 ? 20 : 19)),
    Moves: {
      // Enough fields to satisfy the Move class's category/type asserts when
      // applyExperienceGains wraps freshly-learned moves in `new Move(...)`.
      MOVE_CATEGORIES: { PHYSICAL: 'physical', SPECIAL: 'special', STATUS: 'status' },
      getMovesByGameId: jest.fn(() => [
        { name: 'Razor Leaf', pp: 25, category: 'physical', type: 'grass' },
      ]),
    },
    TYPES: { GRASS: 'grass' },
    // Display-name helper used by `monName()` in applyExperienceGains. Mirrors
    // the data-package implementation: prefer entry.displayName, else
    // title-case the snake_case species id.
    getSpeciesDisplayName: jest.fn(entry => {
      if (entry?.displayName) return entry.displayName;
      return (entry?.species ?? '')
        .split('_')
        .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
    }),
  };
});

import applyExperienceGains from './applyExperienceGains.js';

function makeEnemyMon() {
  return {
    pokemon:       { base_exp_yield: 64 },
    level:         19,
    isAlive:       () => false,
  };
}

function makePlayerMon(moveCount) {
  const allMoves = [
    { name: 'Tackle',    pp: { current: 35, max: 35 } },
    { name: 'Growl',     pp: { current: 40, max: 40 } },
    { name: 'Vine Whip', pp: { current: 25, max: 25 } },
    { name: 'Leech Seed', pp: { current: 10, max: 10 } },
  ];
  return {
    nickname:     null,
    species:      'bulbasaur',
    level:        19,
    exp:          7827, // +173 gain (base 64 × level 19 / 7) → 8000, triggers level 20
    moves:        allMoves.slice(0, moveCount),
    pokemon:      { growth: 'mediumFast', nat_dex_id: 1, species: 'bulbasaur' },
    isAlive:      () => true,
    getName:      () => 'Bulbasaur',
  };
}

function makeContext(playerMon) {
  return {
    config: {
      enemy: {
        isTrainer: false,
        team: { pokemon: [makeEnemyMon()] },
      },
      player: {
        team: { getActivePokemon: () => playerMon },
      },
    },
    logger: { addItem: jest.fn() },
  };
}

describe('applyExperienceGains — move learning with fewer than 4 moves', () => {
  test('auto-learns the move into the empty slot when the pokemon has 3 moves', () => {
    const playerMon = makePlayerMon(3);
    const ctx       = makeContext(playerMon);

    applyExperienceGains.call(ctx);

    expect(playerMon.moves).toHaveLength(4);
    expect(playerMon.moves[3].name).toBe('Razor Leaf');
    expect(playerMon.moves[3].pp).toEqual({ max: 25, current: 25 });
  });

  test('logs the learned move message when auto-learning into an empty slot', () => {
    const playerMon = makePlayerMon(3);
    const ctx       = makeContext(playerMon);

    applyExperienceGains.call(ctx);

    expect(ctx.logger.addItem).toHaveBeenCalledWith('Bulbasaur learned Razor Leaf!');
  });

  test('does NOT add move to pendingMovesToLearn when slot is available', () => {
    const playerMon = makePlayerMon(3);
    const ctx       = makeContext(playerMon);

    applyExperienceGains.call(ctx);

    expect(playerMon.pendingMovesToLearn).toBeUndefined();
  });

  test('queues the move instead when all 4 slots are occupied', () => {
    const playerMon = makePlayerMon(4);
    const ctx       = makeContext(playerMon);

    applyExperienceGains.call(ctx);

    expect(playerMon.moves).toHaveLength(4);
    expect(playerMon.pendingMovesToLearn).toEqual([{ name: 'Razor Leaf', pp: 25 }]);
  });
});
