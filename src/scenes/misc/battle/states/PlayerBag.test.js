jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import PlayerBag from './PlayerBag.js';

function makeItemCtx() {
  const itemData = { getName: jest.fn(() => 'Potion'), onUse: jest.fn(() => ({ message: 'Healed!' })) };
  const inventoryItem = { item: itemData, quantity: 3 };
  const ctx = makeContext();
  ctx.data.player.inventory.items = [inventoryItem];
  return { ctx, inventoryItem };
}

describe('PlayerBag', () => {
  test('populates BagMenu with items plus Cancel', () => {
    const { ctx } = makeItemCtx();
    new PlayerBag().onEnter.call(ctx);
    // 1 item + 1 Cancel = 2 addMenuItem calls
    expect(ctx.BagMenu.addMenuItem).toHaveBeenCalledTimes(2);
  });

  test('calls activateMenu with BagMenu', () => {
    const { ctx } = makeItemCtx();
    new PlayerBag().onEnter.call(ctx);
    expect(ctx.activateMenu).toHaveBeenCalledWith(ctx.BagMenu);
  });

  test('Cancel in BagMenu → PLAYER_ACTION', () => {
    const { ctx } = makeItemCtx();
    new PlayerBag().onEnter.call(ctx);
    ctx.events.emit('bagmenu-select-option-1'); // index 1 = Cancel
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('selecting an item shows PokemonTeamMenu', () => {
    const { ctx } = makeItemCtx();
    new PlayerBag().onEnter.call(ctx);
    ctx.events.emit('bagmenu-select-option-0');
    expect(ctx.activateMenu).toHaveBeenCalledWith(ctx.PokemonTeamMenu);
  });

  test('Cancel in PokemonTeamMenu → PLAYER_ACTION', () => {
    const { ctx } = makeItemCtx();
    new PlayerBag().onEnter.call(ctx);
    ctx.events.emit('bagmenu-select-option-0');
    ctx.events.emit('pokemonteammenu-select-option-1'); // 1 alive mon + Cancel at index 1
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('selecting a pokemon creates USE_ITEM action and goes to ENEMY_ACTION', () => {
    const { ctx } = makeItemCtx();
    new PlayerBag().onEnter.call(ctx);
    ctx.events.emit('bagmenu-select-option-0');
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.actions.player.type).toBe(ActionTypes.USE_ITEM);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('enemyAction');
  });

  test('onExit removes all bagmenu and pokemonteammenu listeners', () => {
    const { ctx } = makeItemCtx();
    const state = new PlayerBag();
    state.onEnter.call(ctx);
    state.onExit.call(ctx);
    ctx.stateMachine.setState.mockClear();
    ctx.events.emit('bagmenu-select-option-1');
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
  });
});
