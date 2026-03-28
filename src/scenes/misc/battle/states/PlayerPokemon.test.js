jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import * as ActionTypes from '../../../../objects/enums/ActionTypes.js';
import { makeContext, makeMon } from './stateTestHelpers.js';
import PlayerPokemon from './PlayerPokemon.js';

describe('PlayerPokemon', () => {
  test('populates PokemonTeamMenu with all team pokemon', () => {
    const ctx = makeContext();
    new PlayerPokemon().onEnter.call(ctx);
    expect(ctx.PokemonTeamMenu.populate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.anything()])
    );
  });

  test('Cancel in PokemonTeamMenu → PLAYER_ACTION', () => {
    const ctx = makeContext();
    const teamLen = ctx.config.player.team.pokemon.length;
    new PlayerPokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-' + teamLen);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('Switch option creates SWITCH_POKEMON action and goes to ENEMY_ACTION', () => {
    const ctx = makeContext();
    const benchMon = makeMon({ id: 'bench-mon', getName: jest.fn(() => 'Charmander') });
    ctx.config.player.team.pokemon.push(benchMon);
    new PlayerPokemon().onEnter.call(ctx);
    // Select bench Pokémon (option-1).
    ctx.events.emit('pokemonteammenu-select-option-1');
    expect(ctx.actions.player.type).toBe(ActionTypes.SWITCH_POKEMON);
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('enemyAction');
  });

  test('switching to active pokemon logs a message and returns to PLAYER_ACTION', () => {
    const ctx = makeContext();
    new PlayerPokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.actions.player).toBeUndefined();
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('already in battle'));
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('playerAction');
  });

  test('onExit clears and hides PokemonTeamMenu and removes listeners', () => {
    const ctx = makeContext();
    const state = new PlayerPokemon();
    state.onEnter.call(ctx);
    state.onExit.call(ctx);
    expect(ctx.PokemonTeamMenu.clear).toHaveBeenCalled();
    expect(ctx.PokemonTeamMenu.setVisible).toHaveBeenCalledWith(false);
    ctx.stateMachine.setState.mockClear();
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
  });
});
