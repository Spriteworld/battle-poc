jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import EnemyAction from './EnemyAction.js';

describe('EnemyAction', () => {
  test('creates an ATTACK action for the enemy', () => {
    const ctx = makeContext();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy).toBeDefined();
    expect(ctx.actions.enemy.type).toBe(ActionTypes.ATTACK);
  });

  test('enemy action targets the player active pokemon', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy.target).toBe(playerMon);
  });

  test('enemy action includes a randomly selected move', () => {
    const ctx = makeContext();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy.config.move).toBeDefined();
  });

  test('schedules transition to BEFORE_ACTION', () => {
    const ctx = makeContext();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });

  test('logs the enemy turn message', () => {
    const ctx = makeContext();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('turn'));
  });
});
