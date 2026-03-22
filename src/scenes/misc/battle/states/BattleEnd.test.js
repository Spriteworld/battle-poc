jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { makeContext } from './stateTestHelpers.js';
import BattleEnd from './BattleEnd.js';

describe('BattleEnd', () => {
  test('transitions to BATTLE_IDLE', () => {
    const ctx = makeContext();
    new BattleEnd().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('battleIdle');
  });
});
