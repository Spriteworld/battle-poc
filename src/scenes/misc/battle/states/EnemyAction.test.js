jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import EnemyAction from './EnemyAction.js';

describe('EnemyAction', () => {
  test('creates an NPC_ATTACK action for the enemy', () => {
    const ctx = makeContext();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy).toBeDefined();
    expect(ctx.actions.enemy.type).toBe(ActionTypes.NPC_ATTACK);
  });

  test('enemy action targets the player active pokemon', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy.target).toBe(playerMon);
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

// ─── Locked move (charge turn auto-continue) ──────────────────────────────────

describe('EnemyAction — lockedMove', () => {
  test('creates an ATTACK action with the locked move', () => {
    const ctx = makeContext();
    const lockedMove = { name: 'Fly', pp: { current: 14, max: 15 } };
    ctx.config.enemy.team.getActivePokemon().lockedMove = { move: lockedMove, invulnerable: true };
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy.type).toBe(ActionTypes.ATTACK);
    expect(ctx.actions.enemy.config.move).toBe(lockedMove);
  });

  test('targets the player active pokemon', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    ctx.config.enemy.team.getActivePokemon().lockedMove = { move: {}, invulnerable: false };
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy.target).toBe(playerMon);
  });

  test('schedules transition to BEFORE_ACTION', () => {
    const ctx = makeContext();
    ctx.config.enemy.team.getActivePokemon().lockedMove = { move: {}, invulnerable: false };
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });
});
