/**
 * ApplyActions — RUN action tests.
 *
 * Kept separate from states.test.js because calcEscape is exported as a
 * non-configurable getter from the compiled ESM data package.  A full module
 * mock (no requireActual) is the only reliable way to intercept it.
 */
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

// Full mock — calcEscape is a jest.fn(), Abilities is provided for SWITCH_POKEMON guard.
// Moves is provided as empty registries so ApplyActions.js can destructure without error.
jest.mock('@spriteworld/pokemon-data', () => ({
  calcEscape: jest.fn(),
  Abilities: {
    ARENA_TRAP:  'Arena Trap',
    SHADOW_TAG:  'Shadow Tag',
    MAGNET_PULL: 'Magnet Pull',
  },
  Moves: {
    MULTI_TURN_MOVES: {},
    MULTI_HIT_MOVES:  {},
    rollHitCount:     jest.fn(() => 2),
  },
}));

// Mock @Objects to prevent Pokemon.js from loading BasePokemon from the mocked data package.
// ApplyActions only needs ActionTypes from @Objects.
jest.mock('@Objects', () => {
  const ActionTypes = require('../../../../objects/enums/ActionTypes.js');
  return { ActionTypes, Action: class Action { constructor(c) { Object.assign(this, c); } } };
});

import * as pokemonData from '@spriteworld/pokemon-data';
import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import ApplyActions from './ApplyActions.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeMon(overrides = {}) {
  return {
    currentHp: 100,
    maxHp: 100,
    stats: { SPEED: 100 },
    getName:          jest.fn(() => 'MockMon'),
    nameWithHP:       jest.fn(() => 'MockMon (100/100)'),
    isAlive:          jest.fn(() => true),
    getMoves:         jest.fn(() => [{ name: 'Tackle', pp: { current: 35, max: 35 } }]),
    hasAbility:       jest.fn(() => false),
    attack:           jest.fn(() => ({ move: 'Tackle', enemy: 'Foe', damage: 10, accuracy: 1, critical: 1, typeEffectiveness: 1 })),
    attackRandomMove: jest.fn(() => ({ move: 'Tackle', enemy: 'Foe', damage: 10, accuracy: 1, critical: 1, typeEffectiveness: 1 })),
    useItem:          jest.fn(() => ({ message: 'HP restored!' })),
    ...overrides,
  };
}

function makeContext() {
  const playerMon = makeMon({ getName: jest.fn(() => 'Bulbasaur') });
  const enemyMon  = makeMon({ getName: jest.fn(() => 'Pikachu') });

  const player = {
    getName: jest.fn(() => 'Player'),
    isWild: false,
    team: {
      pokemon: [playerMon],
      getActivePokemon: jest.fn(() => playerMon),
      setActivePokemon: jest.fn(),
      hasLivingPokemon: jest.fn(() => true),
    },
  };

  const enemy = {
    getName: jest.fn(() => 'Rival'),
    isWild: false,
    team: {
      pokemon: [enemyMon],
      getActivePokemon: jest.fn(() => enemyMon),
      setActivePokemon: jest.fn(),
      hasLivingPokemon: jest.fn(() => true),
    },
  };

  return {
    logger:       { addItem: jest.fn() },
    stateMachine: { setState: jest.fn() },
    stateDef: {
      BATTLE_IDLE:    'battleIdle',
      BEFORE_ACTION:  'beforeAction',
      PLAYER_ACTION:  'playerAction',
      BATTLE_END:     'battleEnd',
    },
    events: { once: jest.fn(), emit: jest.fn(), off: jest.fn(), eventNames: () => [] },
    config: { player, enemy, field: {} },
    actions: {},
    currentAction: null,
    generation: null,
    escapeAttempts: 0,
    time: {
      addEvent: jest.fn(({ callback, callbackScope }) => callback.call(callbackScope)),
    },
    remapActivePokemon: jest.fn(),
    checkForDeadActivePokemon: jest.fn(() => null),
  };
}

// ─── ApplyActions — RUN ────────────────────────────────────────────────────

describe('ApplyActions — RUN', () => {
  beforeEach(() => {
    pokemonData.calcEscape.mockReset();
  });

  function makeRunCtx() {
    const ctx = makeContext();
    ctx.currentAction = {
      type:   ActionTypes.RUN,
      player: ctx.config.player,
      target: ctx.config.enemy,
      config: {},
    };
    return ctx;
  }

  test('increments escapeAttempts', () => {
    pokemonData.calcEscape.mockReturnValue(true);
    const ctx = makeRunCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.escapeAttempts).toBe(1);
  });

  test('on successful escape → BATTLE_END', () => {
    pokemonData.calcEscape.mockReturnValue(true);
    const ctx = makeRunCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('battleEnd');
  });

  test('on failed escape → schedules BEFORE_ACTION', () => {
    pokemonData.calcEscape.mockReturnValue(false);
    const ctx = makeRunCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });

  test('on failed escape logs a failure message', () => {
    pokemonData.calcEscape.mockReturnValue(false);
    const ctx = makeRunCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('escape'));
  });
});
