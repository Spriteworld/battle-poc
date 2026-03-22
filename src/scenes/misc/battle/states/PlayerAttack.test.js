jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import PlayerAttack from './PlayerAttack.js';

describe('PlayerAttack', () => {
  test('adds one item per move plus Cancel to AttackMenu', () => {
    const ctx = makeContext();
    new PlayerAttack().onEnter.call(ctx);
    // 2 moves + 1 Cancel = 3 addMenuItem calls
    expect(ctx.AttackMenu.addMenuItem).toHaveBeenCalledTimes(3);
  });

  test('calls activateMenu with AttackMenu', () => {
    const ctx = makeContext();
    new PlayerAttack().onEnter.call(ctx);
    expect(ctx.activateMenu).toHaveBeenCalledWith(ctx.AttackMenu);
  });

  test('selecting a move creates an ATTACK action targeting the enemy active pokemon', () => {
    const ctx = makeContext();
    new PlayerAttack().onEnter.call(ctx);
    ctx.events.emit('attackmenu-select-option-0');
    expect(ctx.actions.player).toBeDefined();
    expect(ctx.actions.player.type).toBe(ActionTypes.ATTACK);
    expect(ctx.actions.player.config.move).toBeDefined();
  });

  test('selecting a move transitions to ENEMY_ACTION', () => {
    const ctx = makeContext();
    new PlayerAttack().onEnter.call(ctx);
    ctx.events.emit('attackmenu-select-option-0');
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('enemyAction');
  });

  test('selecting a move logs the selection', () => {
    const ctx = makeContext();
    new PlayerAttack().onEnter.call(ctx);
    ctx.events.emit('attackmenu-select-option-0');
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('selected'));
  });

  test('Cancel (last option) transitions to PLAYER_ACTION', () => {
    const ctx = makeContext();
    const moves = ctx.config.player.team.getActivePokemon().getMoves();
    new PlayerAttack().onEnter.call(ctx);
    ctx.events.emit('attackmenu-select-option-' + moves.length);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  describe('when mustStruggle is true', () => {
    function makeStruggleCtx() {
      const ctx = makeContext();
      ctx.config.player.team.getActivePokemon().mustStruggle.mockReturnValue(true);
      return ctx;
    }

    test('queues Struggle immediately without showing the menu', () => {
      const ctx = makeStruggleCtx();
      new PlayerAttack().onEnter.call(ctx);
      expect(ctx.AttackMenu.addMenuItem).not.toHaveBeenCalled();
      expect(ctx.actions.player.type).toBe(ActionTypes.ATTACK);
      expect(ctx.actions.player.config.move).toBeNull();
      expect(ctx.stateMachine.setState).toHaveBeenCalledWith('enemyAction');
    });
  });

  test('onExit removes all attackmenu event listeners', () => {
    const ctx = makeContext();
    const state = new PlayerAttack();
    state.onEnter.call(ctx);
    state.onExit.call(ctx);
    ctx.stateMachine.setState.mockClear();
    ctx.events.emit('attackmenu-select-option-0');
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
  });
});
