import Action from './Action.js';
import * as ActionTypes from '../enums/ActionTypes.js';

const player = { name: 'Player' };
const target = { name: 'Enemy' };
const move   = { name: 'Tackle' };
const item   = { name: 'Potion' };

describe('Action', () => {
  describe('valid construction', () => {
    test('creates an ATTACK action with required move', () => {
      const a = new Action({ type: ActionTypes.ATTACK, player, target, config: { move } });
      expect(a.type).toBe(ActionTypes.ATTACK);
      expect(a.player).toBe(player);
      expect(a.target).toBe(target);
      expect(a.config.move).toBe(move);
    });

    test('creates an NPC_ATTACK action without a pre-selected move', () => {
      const a = new Action({ type: ActionTypes.NPC_ATTACK, player, target });
      expect(a.type).toBe(ActionTypes.NPC_ATTACK);
    });

    test('creates a USE_ITEM action with required item', () => {
      const a = new Action({ type: ActionTypes.USE_ITEM, player, target, config: { item } });
      expect(a.type).toBe(ActionTypes.USE_ITEM);
      expect(a.config.item).toBe(item);
    });

    test('creates a SWITCH_POKEMON action without extra config', () => {
      const a = new Action({ type: ActionTypes.SWITCH_POKEMON, player, target });
      expect(a.type).toBe(ActionTypes.SWITCH_POKEMON);
    });

    test('creates a RUN action without extra config', () => {
      const a = new Action({ type: ActionTypes.RUN, player, target });
      expect(a.type).toBe(ActionTypes.RUN);
    });

    test('config defaults to empty object when omitted', () => {
      const a = new Action({ type: ActionTypes.RUN, player, target });
      expect(a.config).toEqual({});
    });
  });

  describe('validation errors', () => {
    test('throws on unknown action type', () => {
      expect(() => new Action({ type: 'invalid', player, target }))
        .toThrow('Invalid action type');
    });

    test('throws when player is missing', () => {
      expect(() => new Action({ type: ActionTypes.RUN, player: null, target }))
        .toThrow('player and target');
    });

    test('throws when target is missing', () => {
      expect(() => new Action({ type: ActionTypes.RUN, player, target: null }))
        .toThrow('player and target');
    });

    test('throws when ATTACK has no move', () => {
      expect(() => new Action({ type: ActionTypes.ATTACK, player, target }))
        .toThrow('move');
    });

    test('does not throw when NPC_ATTACK has no move (move selected at resolve time)', () => {
      expect(() => new Action({ type: ActionTypes.NPC_ATTACK, player, target }))
        .not.toThrow();
    });

    test('throws when USE_ITEM has no item', () => {
      expect(() => new Action({ type: ActionTypes.USE_ITEM, player, target }))
        .toThrow('item');
    });
  });
});
