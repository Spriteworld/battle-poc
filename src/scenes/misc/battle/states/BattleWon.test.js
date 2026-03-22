jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { makeContext } from './stateTestHelpers.js';
import BattleWon from './BattleWon.js';

describe('BattleWon', () => {
  test('logs a victory message for a wild encounter', () => {
    const ctx = makeContext();
    ctx.config.enemy.isTrainer = false;
    new BattleWon().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('won the battle'));
  });

  test('logs a victory message for a trainer battle', () => {
    const ctx = makeContext();
    ctx.config.enemy.isTrainer = true;
    new BattleWon().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('won the battle'));
  });

  test('logs prize money for a trainer battle', () => {
    const ctx = makeContext();
    ctx.config.enemy.isTrainer = true;
    new BattleWon().onEnter.call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('200'));
  });

  test('transitions to BATTLE_IDLE', () => {
    const ctx = makeContext();
    new BattleWon().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('battleIdle');
  });
});
