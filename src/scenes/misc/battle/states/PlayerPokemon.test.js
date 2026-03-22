jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext } from './stateTestHelpers.js';
import PlayerPokemon from './PlayerPokemon.js';

describe('PlayerPokemon', () => {
  test('populates PokemonTeamMenu with all team pokemon plus Cancel', () => {
    const ctx = makeContext();
    new PlayerPokemon().onEnter.call(ctx);
    // 1 pokemon + Cancel = 2
    expect(ctx.PokemonTeamMenu.addMenuItem).toHaveBeenCalledTimes(2);
  });

  test('Cancel in PokemonTeamMenu → PLAYER_ACTION', () => {
    const ctx = makeContext();
    const teamLen = ctx.config.player.team.pokemon.length;
    new PlayerPokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-' + teamLen);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('selecting a pokemon shows PokemonSwitchMenu with 3 options', () => {
    const ctx = makeContext();
    new PlayerPokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.PokemonSwitchMenu.addMenuItem).toHaveBeenCalledTimes(3);
    expect(ctx.activateMenu).toHaveBeenCalledWith(ctx.PokemonSwitchMenu);
  });

  test('Switch option creates SWITCH_POKEMON action and goes to ENEMY_ACTION', () => {
    const ctx = makeContext();
    new PlayerPokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    ctx.events.emit('pokemonswitchmenu-select-option-0');
    expect(ctx.actions.player.type).toBe(ActionTypes.SWITCH_POKEMON);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('enemyAction');
  });

  test('Details option logs a not-implemented message', () => {
    const ctx = makeContext();
    new PlayerPokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    ctx.events.emit('pokemonswitchmenu-select-option-1');
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('not implemented'));
  });

  test('Cancel in PokemonSwitchMenu → PLAYER_ACTION', () => {
    const ctx = makeContext();
    new PlayerPokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    ctx.events.emit('pokemonswitchmenu-select-option-2');
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('onExit clears and hides both menus and removes their listeners', () => {
    const ctx = makeContext();
    const state = new PlayerPokemon();
    state.onEnter.call(ctx);
    state.onExit.call(ctx);
    expect(ctx.PokemonTeamMenu.clear).toHaveBeenCalled();
    expect(ctx.PokemonTeamMenu.setVisible).toHaveBeenCalledWith(false);
    expect(ctx.PokemonSwitchMenu.clear).toHaveBeenCalled();
    expect(ctx.PokemonSwitchMenu.setVisible).toHaveBeenCalledWith(false);
    ctx.stateMachine.setState.mockClear();
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
  });
});
