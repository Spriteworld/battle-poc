jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import PlayerAction from './PlayerAction.js';

describe('PlayerAction', () => {
  test('logs "What will X do?"', () => {
    const ctx = makeContext();
    new PlayerAction().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('Bulbasaur'));
  });

  test('calls BattleMenu.remap with the four options', () => {
    const ctx = makeContext();
    new PlayerAction().onEnter.call(ctx);
    expect(ctx.BattleMenu.remap).toHaveBeenCalledWith(['Attack', 'Bag', 'Pokemon', 'Run']);
  });

  test('calls activateMenu with BattleMenu', () => {
    const ctx = makeContext();
    new PlayerAction().onEnter.call(ctx);
    expect(ctx.activateMenu).toHaveBeenCalledWith(ctx.BattleMenu);
  });

  test('option 0 (Attack) → PLAYER_ATTACK', () => {
    const ctx = makeContext();
    new PlayerAction().onEnter.call(ctx);
    ctx.events.emit('battlemenu-select-option-0');
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAttack');
  });

  test('option 1 (Bag) → PLAYER_BAG', () => {
    const ctx = makeContext();
    new PlayerAction().onEnter.call(ctx);
    ctx.events.emit('battlemenu-select-option-1');
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerBag');
  });

  test('option 2 (Pokemon) → PLAYER_POKEMON', () => {
    const ctx = makeContext();
    new PlayerAction().onEnter.call(ctx);
    ctx.events.emit('battlemenu-select-option-2');
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerPokemon');
  });

  test('option 3 (Run) vs wild → creates RUN action and goes to ENEMY_ACTION', () => {
    const ctx = makeContext();
    ctx.config.enemy.isWild = true;
    new PlayerAction().onEnter.call(ctx);
    ctx.events.emit('battlemenu-select-option-3');
    expect(ctx.actions.player.type).toBe(ActionTypes.RUN);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('enemyAction');
  });

  test('option 3 (Run) vs trainer → logs refusal and stays in PLAYER_ACTION', () => {
    const ctx = makeContext();
    ctx.config.enemy.isWild = false;
    new PlayerAction().onEnter.call(ctx);
    ctx.events.emit('battlemenu-select-option-3');
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining("can't run"));
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('onExit removes all battlemenu event listeners', () => {
    const ctx = makeContext();
    const state = new PlayerAction();
    state.onEnter.call(ctx);
    state.onExit.call(ctx);
    ctx.stateMachine.setState.mockClear();
    ctx.events.emit('battlemenu-select-option-0');
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
  });
});
