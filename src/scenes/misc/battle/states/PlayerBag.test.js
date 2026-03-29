jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import PlayerBag from './PlayerBag.js';

function makeItem(category = 'medicine') {
  return {
    getName:     jest.fn(() => 'Potion'),
    getCategory: jest.fn(() => category),
    onUse:       jest.fn(() => ({ message: 'Healed!' })),
  };
}

function makeItemCtx(category = 'medicine') {
  const itemData     = makeItem(category);
  const inventoryItem = { item: itemData, quantity: 3 };
  const ctx = makeContext();
  ctx.data.player.inventory.items = [inventoryItem];
  return { ctx, inventoryItem };
}

describe('PlayerBag', () => {
  test('populates BagMenu with items plus Cancel', () => {
    const { ctx } = makeItemCtx();
    new PlayerBag().onEnter.call(ctx);
    // 1 medicine item + 1 Cancel = 2 addMenuItem calls
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
    ctx.events.emit('bagmenu-select-option-1'); // 1 item → Cancel at index 1
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

  test('onExit removes all bagmenu, pokemonteammenu, and tab-change listeners', () => {
    const { ctx } = makeItemCtx();
    const state = new PlayerBag();
    state.onEnter.call(ctx);
    state.onExit.call(ctx);
    ctx.stateMachine.setState.mockClear();
    ctx.events.emit('bagmenu-select-option-1');
    ctx.events.emit('bagmenu-tab-change', 1);
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
    expect(ctx.BagMenu.addMenuItem).toHaveBeenCalledTimes(2); // no re-populate on tab change
  });

  test('items with wrong category are hidden in their tab', () => {
    const ctx = makeContext();
    ctx.data.player.inventory.items = [
      { item: makeItem('medicine'), quantity: 2 },
      { item: makeItem('balls'),    quantity: 5 },
    ];
    // Default tab is 0 = medicine
    new PlayerBag().onEnter.call(ctx);
    // Only the medicine item + Cancel should appear (not the balls item)
    expect(ctx.BagMenu.addMenuItem).toHaveBeenCalledTimes(2);
    expect(ctx.BagMenu.addMenuItem).toHaveBeenNthCalledWith(1, expect.stringContaining('x2'));
  });

  test('switching tabs via bagmenu-tab-change re-populates list', () => {
    const ctx = makeContext();
    ctx.data.player.inventory.items = [
      { item: makeItem('medicine'), quantity: 2 },
      { item: makeItem('balls'),    quantity: 5 },
    ];
    new PlayerBag().onEnter.call(ctx);
    ctx.BagMenu.addMenuItem.mockClear();

    // Simulate right-arrow tab change to Balls (index 2 — Med, Items, Balls, …)
    ctx.events.emit('bagmenu-tab-change', 2);

    // Now balls item + Cancel should appear
    expect(ctx.BagMenu.addMenuItem).toHaveBeenCalledTimes(2);
    expect(ctx.BagMenu.addMenuItem).toHaveBeenNthCalledWith(1, expect.stringContaining('x5'));
  });

  test('empty tab shows only Cancel', () => {
    const { ctx } = makeItemCtx('medicine');
    new PlayerBag().onEnter.call(ctx);
    ctx.BagMenu.addMenuItem.mockClear();

    // Switch to Balls tab (index 1) — no balls in inventory
    ctx.events.emit('bagmenu-tab-change', 1);

    expect(ctx.BagMenu.addMenuItem).toHaveBeenCalledTimes(1);
    expect(ctx.BagMenu.addMenuItem).toHaveBeenCalledWith('Cancel');
  });

  test('items with quantity 0 are excluded from the list', () => {
    const ctx = makeContext();
    ctx.data.player.inventory.items = [
      { item: makeItem('medicine'), quantity: 0 },
      { item: makeItem('medicine'), quantity: 1 },
    ];
    new PlayerBag().onEnter.call(ctx);
    // Only the quantity=1 item + Cancel (not the exhausted one)
    expect(ctx.BagMenu.addMenuItem).toHaveBeenCalledTimes(2);
  });

  test('_bagTabIndex persists across re-entries', () => {
    const { ctx } = makeItemCtx();
    const state = new PlayerBag();
    state.onEnter.call(ctx);
    ctx.events.emit('bagmenu-tab-change', 3); // switch to Berry tab
    state.onExit.call(ctx);

    ctx.BagMenu.setActiveTab.mockClear();
    state.onEnter.call(ctx);
    // Should restore Berry tab (index 3)
    expect(ctx.BagMenu.setActiveTab).toHaveBeenCalledWith(3);
  });
});
