import StateMachine from './StateMachine.js';

describe('StateMachine', () => {
  let sm;
  let context;

  beforeEach(() => {
    context = { value: 0 };
    sm = new StateMachine(context);
  });

  describe('addState / setState', () => {
    test('transitions to a registered state', () => {
      const onEnter = jest.fn();
      sm.addState('idle', { onEnter });
      sm.setState('idle');
      expect(sm.isCurrentState('idle')).toBe(true);
    });

    test('calls onEnter when entering a state', () => {
      const onEnter = jest.fn();
      sm.addState('idle', { onEnter });
      sm.setState('idle');
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    test('calls onExit when leaving a state', () => {
      const onExit = jest.fn();
      sm.addState('idle', { onExit });
      sm.addState('active', {});
      sm.setState('idle');
      sm.setState('active');
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    test('binds onEnter to context', () => {
      sm.addState('idle', {
        onEnter() { this.value = 42; },
      });
      sm.setState('idle');
      expect(context.value).toBe(42);
    });

    test('binds onExit to context', () => {
      sm.addState('idle', {
        onExit() { this.value = 99; },
      });
      sm.addState('active', {});
      sm.setState('idle');
      sm.setState('active');
      expect(context.value).toBe(99);
    });

    test('ignores transition to unknown state', () => {
      sm.addState('idle', {});
      sm.setState('idle');
      sm.setState('nonexistent');
      expect(sm.isCurrentState('idle')).toBe(true);
    });

    test('ignores transition to current state', () => {
      const onEnter = jest.fn();
      sm.addState('idle', { onEnter });
      sm.setState('idle');
      sm.setState('idle');
      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    test('tracks previous state', () => {
      sm.addState('idle', {});
      sm.addState('active', {});
      sm.setState('idle');
      sm.setState('active');
      expect(sm.previousState.name).toBe('idle');
    });
  });

  describe('isCurrentState', () => {
    test('returns false before any state is set', () => {
      sm.addState('idle', {});
      expect(sm.isCurrentState('idle')).toBe(false);
    });

    test('returns true for the active state', () => {
      sm.addState('idle', {});
      sm.setState('idle');
      expect(sm.isCurrentState('idle')).toBe(true);
    });

    test('returns false for an inactive state', () => {
      sm.addState('idle', {});
      sm.addState('active', {});
      sm.setState('idle');
      expect(sm.isCurrentState('active')).toBe(false);
    });
  });

  describe('update', () => {
    test('calls onUpdate for the current state', () => {
      const onUpdate = jest.fn();
      sm.addState('idle', { onUpdate });
      sm.setState('idle');
      sm.update(16);
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    test('processes queued state changes', () => {
      // Queue a transition that happens during onEnter
      sm.addState('idle', {
        onEnter() { sm.setState('active'); }, // queued because isChangingState = true
      });
      sm.addState('active', {});
      sm.setState('idle');

      // After setState('idle') returns, the queue has 'active'
      sm.update(0);
      expect(sm.isCurrentState('active')).toBe(true);
    });
  });

  describe('addState returns this (chaining)', () => {
    test('supports chained addState calls', () => {
      const result = sm
        .addState('idle', {})
        .addState('active', {});
      expect(result).toBe(sm);
    });
  });
});
