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

});

// ─── AI switch decision ───────────────────────────────────────────────────────

describe('EnemyAction — shouldSwitch', () => {
  test('creates a SWITCH_POKEMON action when the AI proposes a teammate', () => {
    const ctx = makeContext();
    const benched = ctx.config.enemy.team.getActivePokemon(); // mock second mon
    const replacement = { id: 'reserve', currentHp: 100, getName: () => 'Reserve' };
    ctx.config.enemy.team.pokemon = [benched, replacement];
    ctx.config.enemy.ai.shouldSwitch = jest.fn(() => replacement);

    new EnemyAction().onEnter.call(ctx);

    expect(ctx.actions.enemy.type).toBe(ActionTypes.SWITCH_POKEMON);
    expect(ctx.actions.enemy.player).toBe(ctx.config.enemy);
    expect(ctx.actions.enemy.config.pokemon).toBe(replacement);
    expect(ctx.actions.enemy.target).toBe(ctx.config.player.team.getActivePokemon());
  });

  test('falls back to NPC_ATTACK when the AI returns null', () => {
    const ctx = makeContext();
    ctx.config.enemy.ai.shouldSwitch = jest.fn(() => null);
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.actions.enemy.type).toBe(ActionTypes.NPC_ATTACK);
  });

  test('passes active, opponent, team and generation to shouldSwitch', () => {
    const ctx = makeContext();
    ctx.config.enemy.ai.shouldSwitch = jest.fn(() => null);
    const activeMon = ctx.config.enemy.team.getActivePokemon();
    const playerMon = ctx.config.player.team.getActivePokemon();
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.config.enemy.ai.shouldSwitch).toHaveBeenCalledWith(
      activeMon, playerMon, ctx.config.enemy.team.pokemon, ctx.generation
    );
  });

  test('skips shouldSwitch when the active Pokémon is locked into a charge move', () => {
    const ctx = makeContext();
    ctx.config.enemy.team.getActivePokemon().lockedMove = { move: { name: 'Fly' }, invulnerable: true };
    ctx.config.enemy.ai.shouldSwitch = jest.fn(() => ({ id: 'other' }));
    new EnemyAction().onEnter.call(ctx);
    expect(ctx.config.enemy.ai.shouldSwitch).not.toHaveBeenCalled();
    expect(ctx.actions.enemy.type).toBe(ActionTypes.ATTACK);
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
