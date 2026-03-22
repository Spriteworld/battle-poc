import * as ActionTypes from './ActionTypes.js';

describe('ActionTypes', () => {
  test('exports all expected action type constants', () => {
    expect(ActionTypes.ATTACK).toBe('attack');
    expect(ActionTypes.NPC_ATTACK).toBe('npc_attack');
    expect(ActionTypes.USE_ITEM).toBe('use_item');
    expect(ActionTypes.SWITCH_POKEMON).toBe('switch_pokemon');
    expect(ActionTypes.RUN).toBe('run');
  });

  test('all values are unique strings', () => {
    const values = Object.values(ActionTypes);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
    values.forEach(v => expect(typeof v).toBe('string'));
  });
});
