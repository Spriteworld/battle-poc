jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { makeContext } from './stateTestHelpers.js';
import BattleLost from './BattleLost.js';

describe('BattleLost', () => {
  test('does not crash', () => {
    const ctx = makeContext();
    expect(() => new BattleLost().onEnter.call(ctx)).not.toThrow();
  });

  test('transitions to BATTLE_IDLE', () => {
    const ctx = makeContext();
    new BattleLost().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('battleIdle');
  });

  test('always logs the blackout line', () => {
    const ctx = makeContext();
    new BattleLost().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith('You blacked out!');
  });

  test('does not add the trainer victory taunt for wild encounters', () => {
    const ctx = makeContext();
    ctx.config.enemy.isTrainer     = false;
    ctx.config.enemy.wonFightText = 'You\'re no match for me!';
    ctx._spawnTrainerSprite  = jest.fn(cb => cb?.());
    ctx._dismissTrainerSprite = jest.fn(cb => cb?.());
    new BattleLost().onEnter.call(ctx);
    expect(ctx.logger.addItem).not.toHaveBeenCalledWith('You\'re no match for me!');
    expect(ctx._spawnTrainerSprite).not.toHaveBeenCalled();
  });

  test('adds the trainer victory taunt before the blackout when wonFightText is set', () => {
    const ctx = makeContext();
    ctx.config.enemy.isTrainer      = true;
    ctx.config.enemy.wonFightText = 'You\'re no match for me!';
    ctx._spawnTrainerSprite   = jest.fn(cb => cb?.());
    ctx._dismissTrainerSprite = jest.fn(cb => cb?.());
    new BattleLost().onEnter.call(ctx);
    expect(ctx._spawnTrainerSprite).toHaveBeenCalled();
    expect(ctx.logger.addItem).toHaveBeenCalledWith('You\'re no match for me!');
    expect(ctx._dismissTrainerSprite).toHaveBeenCalled();
    expect(ctx.logger.addItem).toHaveBeenCalledWith('You blacked out!');
    // Taunt is logged before the blackout line.
    const tauntCall   = ctx.logger.addItem.mock.calls.findIndex(c => c[0] === 'You\'re no match for me!');
    const blackoutCall = ctx.logger.addItem.mock.calls.findIndex(c => c[0] === 'You blacked out!');
    expect(tauntCall).toBeLessThan(blackoutCall);
  });

  test('skips the taunt path when wonFightText is empty', () => {
    const ctx = makeContext();
    ctx.config.enemy.isTrainer      = true;
    ctx.config.enemy.wonFightText = '';
    ctx._spawnTrainerSprite = jest.fn(cb => cb?.());
    new BattleLost().onEnter.call(ctx);
    expect(ctx._spawnTrainerSprite).not.toHaveBeenCalled();
  });
});
