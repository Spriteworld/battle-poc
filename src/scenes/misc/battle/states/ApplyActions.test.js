jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { GEN_3, Abilities } from '@spriteworld/pokemon-data';
import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext, makeMon } from './stateTestHelpers.js';
import ApplyActions from './ApplyActions.js';

// ─── No action ─────────────────────────────────────────────────────────────

describe('ApplyActions — no action', () => {
  test('transitions to BATTLE_IDLE when currentAction is null', () => {
    const ctx = makeContext();
    ctx.currentAction = null;
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('battleIdle');
  });
});

// ─── USE_ITEM ──────────────────────────────────────────────────────────────

describe('ApplyActions — USE_ITEM', () => {
  function makeItemCtx() {
    const ctx = makeContext();
    const inventoryItem = { item: {}, quantity: 3 };
    const playerMon = ctx.config.player.team.getActivePokemon();
    ctx.currentAction = {
      type:   ActionTypes.USE_ITEM,
      player: ctx.config.player,
      target: playerMon,
      config: { item: inventoryItem },
    };
    return { ctx, inventoryItem, playerMon };
  }

  test('calls target.useItem', () => {
    const { ctx, playerMon } = makeItemCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.useItem).toHaveBeenCalled();
  });

  test('logs the item result message', () => {
    const { ctx } = makeItemCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith('HP restored!');
  });

  test('decrements item quantity by 1', () => {
    const { ctx, inventoryItem } = makeItemCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(inventoryItem.quantity).toBe(2);
  });

  test('schedules transition to BEFORE_ACTION', () => {
    const { ctx } = makeItemCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });
});

// ─── SWITCH_POKEMON ────────────────────────────────────────────────────────

describe('ApplyActions — SWITCH_POKEMON', () => {
  function makeSwitchCtx(pokemonOverrides = {}) {
    const ctx = makeContext();
    const newMon = makeMon({ getName: jest.fn(() => 'Charizard'), ...pokemonOverrides });
    ctx.actions.enemy = { target: ctx.config.enemy.team.getActivePokemon() };
    ctx.currentAction = {
      type:   ActionTypes.SWITCH_POKEMON,
      player: ctx.config.player,
      target: ctx.config.enemy.team.getActivePokemon(),
      config: { pokemon: newMon },
    };
    return { ctx, newMon };
  }

  test('switches the active pokemon when no blocking ability is present', () => {
    const { ctx, newMon } = makeSwitchCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.config.player.team.setActivePokemon).toHaveBeenCalledWith(newMon);
  });

  test('logs the switch message', () => {
    const { ctx } = makeSwitchCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('switched to'));
  });

  test('schedules BEFORE_ACTION after switch', () => {
    const { ctx } = makeSwitchCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });

  test('transitions to PLAYER_ACTION when enemy has Arena Trap', () => {
    const { ctx } = makeSwitchCtx();
    ctx.config.enemy.team.getActivePokemon().hasAbility.mockImplementation(
      name => name === Abilities.ARENA_TRAP
    );
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });
});

// ─── ATTACK ────────────────────────────────────────────────────────────────

describe('ApplyActions — ATTACK', () => {
  function makeAttackCtx(attackOverrides = {}) {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    const move = { name: 'Tackle', pp: { current: 35, max: 35 } };
    playerMon.attack.mockReturnValue({
      move: 'Tackle', enemy: 'Pikachu',
      damage: 10, accuracy: 1, critical: 1, typeEffectiveness: 1,
      ...attackOverrides,
    });
    ctx.currentAction = {
      type:   ActionTypes.ATTACK,
      player: ctx.config.player,
      target: enemyMon,
      config: { move },
    };
    return { ctx, playerMon, enemyMon, move };
  }

  test('calls activeMon.attack with the move and generation', () => {
    const { ctx, playerMon, move } = makeAttackCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.attack).toHaveBeenCalledWith(
      ctx.config.enemy.team.getActivePokemon(), move, GEN_3
    );
  });

  test('logs "X uses Y against Z"', () => {
    const { ctx } = makeAttackCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('uses'));
  });

  test('on a hit: logs damage and schedules BEFORE_ACTION', () => {
    const { ctx } = makeAttackCtx({ damage: 15 });
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('15'));
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });

  test('on a miss (accuracy 0): logs miss and schedules BEFORE_ACTION', () => {
    const { ctx } = makeAttackCtx({ accuracy: 0 });
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('missed'));
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });

  test('on no effect (damage 0): logs no effect and schedules BEFORE_ACTION', () => {
    const { ctx } = makeAttackCtx({ damage: 0 });
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('no effect'));
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });

  test('on a critical hit: logs critical hit message', () => {
    const { ctx } = makeAttackCtx({ critical: 2 });
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('critical'));
  });

  test('on super effective hit: logs super effective message', () => {
    const { ctx } = makeAttackCtx({ typeEffectiveness: 2 });
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('super effective'));
  });

  test('on not very effective hit: logs not very effective message', () => {
    const { ctx } = makeAttackCtx({ typeEffectiveness: 0.5 });
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('effective'));
  });

  test('clears currentAction after attack', () => {
    const { ctx } = makeAttackCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.currentAction).toBeNull();
  });

  test('calls remapActivePokemon after a successful attack', () => {
    const { ctx } = makeAttackCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.remapActivePokemon).toHaveBeenCalled();
  });
});

// ─── Invulnerability ───────────────────────────────────────────────────────────

describe('ApplyActions — invulnerable target', () => {
  test('logs the attacker name and "failed" when the target is invulnerable', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    enemyMon.invulnerable = true;
    ctx.currentAction = {
      type: ActionTypes.ATTACK,
      player: ctx.config.player,
      target: enemyMon,
      config: { move: { name: 'Tackle', pp: { current: 35, max: 35 } } },
    };
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('failed'));
  });

  test('does not call activeMon.attack when target is invulnerable', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    enemyMon.invulnerable = true;
    ctx.currentAction = {
      type: ActionTypes.ATTACK,
      player: ctx.config.player,
      target: enemyMon,
      config: { move: { name: 'Tackle', pp: { current: 35, max: 35 } } },
    };
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.attack).not.toHaveBeenCalled();
  });

  test('schedules BEFORE_ACTION after a failed invulnerability check', () => {
    const ctx = makeContext();
    const enemyMon = ctx.config.enemy.team.getActivePokemon();
    enemyMon.invulnerable = true;
    ctx.currentAction = {
      type: ActionTypes.ATTACK,
      player: ctx.config.player,
      target: enemyMon,
      config: { move: { name: 'Tackle', pp: { current: 35, max: 35 } } },
    };
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });
});

// ─── Multi-turn moves ──────────────────────────────────────────────────────────

describe('ApplyActions — multi-turn charge turn', () => {
  function makeChargeCtx() {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    const move = { name: 'Fly', pp: { current: 15, max: 15 } };
    ctx.currentAction = {
      type:   ActionTypes.ATTACK,
      player: ctx.config.player,
      target: enemyMon,
      config: { move },
    };
    return { ctx, playerMon, enemyMon, move };
  }

  test('sets lockedMove on the attacker with the move and invulnerability flag', () => {
    const { ctx, playerMon, move } = makeChargeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.lockedMove).toEqual({ move, invulnerable: true });
  });

  test('marks the attacker as invulnerable', () => {
    const { ctx, playerMon } = makeChargeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.invulnerable).toBe(true);
  });

  test('decrements PP by 1 on the charge turn', () => {
    const { ctx, move } = makeChargeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(move.pp.current).toBe(14);
  });

  test('logs the charge message', () => {
    const { ctx } = makeChargeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(
      expect.stringContaining('flew up high')
    );
  });

  test('does not call activeMon.attack on the charge turn', () => {
    const { ctx, playerMon } = makeChargeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.attack).not.toHaveBeenCalled();
  });

  test('schedules BEFORE_ACTION after the charge turn', () => {
    const { ctx } = makeChargeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });
});

describe('ApplyActions — multi-turn strike turn', () => {
  function makeStrikeCtx() {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    const move = { name: 'Fly', pp: { current: 14, max: 15 } };
    playerMon.lockedMove   = { move, invulnerable: true };
    playerMon.invulnerable = true;
    ctx.currentAction = {
      type:   ActionTypes.ATTACK,
      player: ctx.config.player,
      target: enemyMon,
      config: { move },
    };
    return { ctx, playerMon, enemyMon, move };
  }

  test('calls attackLocked instead of attack on the strike turn', () => {
    const { ctx, playerMon } = makeStrikeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.attackLocked).toHaveBeenCalled();
    expect(playerMon.attack).not.toHaveBeenCalled();
  });

  test('clears lockedMove after the strike', () => {
    const { ctx, playerMon } = makeStrikeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.lockedMove).toBeNull();
  });

  test('clears invulnerable after the strike', () => {
    const { ctx, playerMon } = makeStrikeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.invulnerable).toBe(false);
  });

  test('schedules BEFORE_ACTION after the strike', () => {
    const { ctx } = makeStrikeCtx();
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });
});

// ─── Multi-hit moves ───────────────────────────────────────────────────────────

describe('ApplyActions — multi-hit moves', () => {
  function makeMultiHitCtx() {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    const move = { name: 'Fury Attack', pp: { current: 20, max: 20 } };
    ctx.currentAction = {
      type:   ActionTypes.ATTACK,
      player: ctx.config.player,
      target: enemyMon,
      config: { move },
    };
    return { ctx, playerMon, enemyMon, move };
  }

  test('calls attackMultiHit instead of attack for multi-hit moves', () => {
    const { ctx, playerMon } = makeMultiHitCtx();
    // Control rollHitCount: Math.random → index 0 → 2 hits
    jest.spyOn(Math, 'random').mockReturnValue(0);
    new ApplyActions().onEnter.call(ctx);
    expect(playerMon.attackMultiHit).toHaveBeenCalled();
    expect(playerMon.attack).not.toHaveBeenCalled();
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('logs "Hit X times!" when info.hits > 1', () => {
    const { ctx } = makeMultiHitCtx();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('Hit 3 times'));
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('schedules BEFORE_ACTION after a multi-hit attack', () => {
    const { ctx } = makeMultiHitCtx();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    new ApplyActions().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
    jest.spyOn(Math, 'random').mockRestore();
  });
});
