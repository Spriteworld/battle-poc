jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { STATS, STATUS } from '@spriteworld/pokemon-data';
import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import BeforeAction from './BeforeAction.js';

describe('BeforeAction', () => {
  test('transitions to PLAYER_ACTION when there are no pending actions', () => {
    const ctx = makeContext();
    ctx.actions = {};
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('defers to checkForDeadActivePokemon when a pokemon has fainted', () => {
    const ctx = makeContext();
    ctx.checkForDeadActivePokemon.mockReturnValue('playerNewActivePokemon');
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerNewActivePokemon');
  });

  test('with one action: sets currentAction and transitions to APPLY_ACTIONS', () => {
    const ctx = makeContext();
    const action = { type: ActionTypes.ATTACK, player: ctx.config.player, target: ctx.config.enemy.team.getActivePokemon(), config: { move: {} } };
    ctx.actions = { player: action };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(action);
    expect(ctx.actions.player).toBeUndefined();
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('applyActions');
  });

  test('with two ATTACK actions, player faster: picks player action first', () => {
    const ctx = makeContext();
    // player speed 100, enemy speed 80 (set in makeContext defaults)
    const playerAction = { type: ActionTypes.ATTACK, player: ctx.config.player, target: {}, config: { move: {} } };
    const enemyAction  = { type: ActionTypes.ATTACK, player: ctx.config.enemy,  target: {}, config: { move: {} } };
    ctx.actions = { player: playerAction, enemy: enemyAction };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(playerAction);
    expect(ctx.actions.player).toBeUndefined();
    expect(ctx.actions.enemy).toBe(enemyAction);
  });

  test('with two ATTACK actions, enemy faster: picks enemy action first', () => {
    const ctx = makeContext();
    ctx.config.player.team.getActivePokemon().stats[STATS.SPEED] = 50;
    ctx.config.enemy.team.getActivePokemon().stats[STATS.SPEED] = 120;
    const playerAction = { type: ActionTypes.ATTACK, player: ctx.config.player, target: {}, config: { move: {} } };
    const enemyAction  = { type: ActionTypes.ATTACK, player: ctx.config.enemy,  target: {}, config: { move: {} } };
    ctx.actions = { player: playerAction, enemy: enemyAction };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(enemyAction);
  });

  test('with player non-ATTACK action: picks player action first regardless of speed', () => {
    const ctx = makeContext();
    ctx.config.player.team.getActivePokemon().stats[STATS.SPEED] = 10;
    ctx.config.enemy.team.getActivePokemon().stats[STATS.SPEED] = 200;
    const playerAction = { type: ActionTypes.SWITCH_POKEMON, player: ctx.config.player, target: {}, config: { pokemon: {} } };
    const enemyAction  = { type: ActionTypes.ATTACK, player: ctx.config.enemy, target: {}, config: { move: {} } };
    ctx.actions = { player: playerAction, enemy: enemyAction };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(playerAction);
  });

  test('priority: player Quick Attack (+1) goes before enemy normal move even if enemy is faster', () => {
    const ctx = makeContext();
    ctx.config.player.team.getActivePokemon().stats[STATS.SPEED] = 10;
    ctx.config.enemy.team.getActivePokemon().stats[STATS.SPEED] = 200;
    const playerAction = { type: ActionTypes.ATTACK, player: ctx.config.player, target: {}, config: { move: { name: 'quick attack', priority: 1 } } };
    const enemyAction  = { type: ActionTypes.ATTACK, player: ctx.config.enemy,  target: {}, config: { move: { name: 'tackle', priority: 0 } } };
    ctx.actions = { player: playerAction, enemy: enemyAction };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(playerAction);
  });

  test('priority: enemy Quick Attack (+1) goes before player normal move even if player is faster', () => {
    const ctx = makeContext();
    ctx.config.player.team.getActivePokemon().stats[STATS.SPEED] = 200;
    ctx.config.enemy.team.getActivePokemon().stats[STATS.SPEED] = 10;
    const playerAction = { type: ActionTypes.ATTACK, player: ctx.config.player, target: {}, config: { move: { name: 'tackle', priority: 0 } } };
    const enemyAction  = { type: ActionTypes.ATTACK, player: ctx.config.enemy,  target: {}, config: { move: { name: 'quick attack', priority: 1 } } };
    ctx.actions = { player: playerAction, enemy: enemyAction };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(enemyAction);
  });

  test('priority: same tier falls back to speed order', () => {
    const ctx = makeContext();
    // player speed 100 > enemy speed 80
    const playerAction = { type: ActionTypes.ATTACK, player: ctx.config.player, target: {}, config: { move: { name: 'quick attack', priority: 1 } } };
    const enemyAction  = { type: ActionTypes.ATTACK, player: ctx.config.enemy,  target: {}, config: { move: { name: 'mach punch', priority: 1 } } };
    ctx.actions = { player: playerAction, enemy: enemyAction };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(playerAction); // player faster at same +1 priority
  });

  test('calls applyEndOfTurnStatus when all actions are consumed', () => {
    const ctx = makeContext();
    ctx.actions = {};
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.applyEndOfTurnStatus).toHaveBeenCalled();
  });

  test('paralysis halves player speed for turn-order purposes', () => {
    const ctx = makeContext();
    // player speed 100 → paralyzed → effective 50 < enemy 80
    ctx.config.player.team.getActivePokemon().status[STATUS.PARALYZE] = 1;
    const playerAction = { type: ActionTypes.ATTACK, player: ctx.config.player, target: {}, config: { move: {} } };
    const enemyAction  = { type: ActionTypes.ATTACK, player: ctx.config.enemy,  target: {}, config: { move: {} } };
    ctx.actions = { player: playerAction, enemy: enemyAction };
    new BeforeAction().onEnter.call(ctx);
    expect(ctx.currentAction).toBe(enemyAction); // enemy goes first because player speed is halved
  });
});
