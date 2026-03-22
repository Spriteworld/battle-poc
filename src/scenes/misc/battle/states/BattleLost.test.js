jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { makeContext } from './stateTestHelpers.js';
import BattleLost from './BattleLost.js';

describe('BattleLost', () => {
  test('does not crash', () => {
    const ctx = makeContext();
    expect(() => new BattleLost().onEnter.call(ctx)).not.toThrow();
  });

  test('does not call setState (transition is commented out)', () => {
    const ctx = makeContext();
    new BattleLost().onEnter.call(ctx);
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
  });
});
