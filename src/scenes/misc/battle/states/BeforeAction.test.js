jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { STATS } from '@spriteworld/pokemon-data';
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
});
