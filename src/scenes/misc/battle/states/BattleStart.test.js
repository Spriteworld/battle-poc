jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

// Stub @Objects so BattleStart gets light-weight trainer constructors
// instead of instantiating full BattlePokemon objects via the data package.
jest.mock('@Objects', () => {
  function BattleTeam(team) {
    this.pokemon = team || [];
    this.getActivePokemon = () => this.pokemon[0] || null;
  }
  function BattleTrainer(config) {
    Object.assign(this, config);
    this.getName = () => config.name || 'Trainer';
    this.isWild = false;
    this.team = new BattleTeam(config.team);
  }
  function WildTrainer(config) {
    Object.assign(this, config);
    this.name = 'Wild';
    this.getName = () => 'Wild';
    this.isWild = true;
    this.team = new BattleTeam(config.team);
  }
  return { BattleTrainer, WildTrainer, BattleTeam };
});

import { GEN_3, GEN_6, GENERATIONS } from '@spriteworld/pokemon-data';
import BattleStart from './BattleStart.js';

function makeEvents() {
  const handlers = {};
  return {
    _handlers: handlers,
    once(name, fn) {
      if (!handlers[name]) handlers[name] = [];
      handlers[name].push(fn);
    },
    emit(name, ...args) {
      const fns = handlers[name] || [];
      delete handlers[name];
      fns.forEach(fn => fn(...args));
    },
    off(name) { delete handlers[name]; },
    eventNames() { return Object.keys(handlers); },
  };
}

const basePlayerData = { name: 'Red', team: [{ name: 'Bulbasaur' }] };
const baseEnemyData  = { name: 'Pikachu', team: [{ name: 'Pikachu' }], isTrainer: false };

function makeContext(dataOverrides = {}) {
  const ctx = {
    data: {
      player: basePlayerData,
      enemy:  baseEnemyData,
      field:  {},
      ...dataOverrides,
    },
    logger:       { addItem: jest.fn(), flush: jest.fn(cb => cb?.()) },
    stateMachine: { setState: jest.fn() },
    stateDef: {
      PLAYER_ACTION: 'playerAction',
      BATTLE_IDLE:   'battleIdle',
    },
    events:            makeEvents(),
    remapActivePokemon: jest.fn(),
    config:            {},
    generation:        null,
    escapeAttempts:    0,
  };
  return ctx;
}

describe('BattleStart', () => {
  describe('trainer setup', () => {
    test('creates a BattleTrainer for the player', () => {
      const { BattleTrainer } = require('@Objects');
      const ctx = makeContext();
      new BattleStart().onEnter.call(ctx);
      expect(ctx.config.player).toBeInstanceOf(BattleTrainer);
    });

    test('creates a WildTrainer for a non-trainer enemy', () => {
      const { WildTrainer } = require('@Objects');
      const ctx = makeContext();
      new BattleStart().onEnter.call(ctx);
      expect(ctx.config.enemy).toBeInstanceOf(WildTrainer);
    });

    test('creates a BattleTrainer for a trainer enemy', () => {
      const { BattleTrainer } = require('@Objects');
      const ctx = makeContext({ enemy: { ...baseEnemyData, isTrainer: true } });
      new BattleStart().onEnter.call(ctx);
      expect(ctx.config.enemy).toBeInstanceOf(BattleTrainer);
    });
  });

  describe('generation resolution', () => {
    test('resolves generation from a string key', () => {
      const ctx = makeContext({ generation: 'GEN_6' });
      new BattleStart().onEnter.call(ctx);
      expect(ctx.generation).toBe(GEN_6);
    });

    test('resolves generation from a config object passed directly', () => {
      const ctx = makeContext({ generation: GEN_6 });
      new BattleStart().onEnter.call(ctx);
      expect(ctx.generation).toBe(GEN_6);
    });

    test('defaults to GEN_3 when no generation is specified', () => {
      const ctx = makeContext();
      new BattleStart().onEnter.call(ctx);
      expect(ctx.generation).toBe(GEN_3);
    });

    test('defaults to GEN_3 for an unrecognised string key', () => {
      const ctx = makeContext({ generation: 'GEN_99' });
      new BattleStart().onEnter.call(ctx);
      expect(ctx.generation).toBe(GEN_3);
    });
  });

  describe('battle setup side-effects', () => {
    test('emits "battle-start" event', () => {
      const ctx = makeContext();
      const spy = jest.spyOn(ctx.events, 'emit');
      new BattleStart().onEnter.call(ctx);
      expect(spy).toHaveBeenCalledWith('battle-start', ctx.data);
    });

    test('calls remapActivePokemon', () => {
      const ctx = makeContext();
      new BattleStart().onEnter.call(ctx);
      expect(ctx.remapActivePokemon).toHaveBeenCalledTimes(1);
    });

    test('transitions to PLAYER_ACTION', () => {
      const ctx = makeContext();
      new BattleStart().onEnter.call(ctx);
      expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
    });

    test('sets config.field from data.field', () => {
      const ctx = makeContext({ field: { weather: 'rain' } });
      new BattleStart().onEnter.call(ctx);
      expect(ctx.config.field).toEqual({ weather: 'rain' });
    });

    test('resets escapeAttempts to 0', () => {
      const ctx = makeContext();
      ctx.escapeAttempts = 5;
      new BattleStart().onEnter.call(ctx);
      expect(ctx.escapeAttempts).toBe(0);
    });
  });

  describe('invalid data guard', () => {
    test('returns early and does not transition when data is missing', () => {
      const ctx = makeContext();
      ctx.data = null;
      new BattleStart().onEnter.call(ctx);
      expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
    });

    test('returns early when player data is missing', () => {
      const ctx = makeContext();
      ctx.data = { enemy: baseEnemyData };
      new BattleStart().onEnter.call(ctx);
      expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
    });

    test('returns early when enemy data is missing', () => {
      const ctx = makeContext();
      ctx.data = { player: basePlayerData };
      new BattleStart().onEnter.call(ctx);
      expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
    });

    test('returns early when player data is empty object', () => {
      const ctx = makeContext({ player: {}, enemy: baseEnemyData });
      new BattleStart().onEnter.call(ctx);
      expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
    });
  });
});
