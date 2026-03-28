jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

import { makeContext, makeMon } from './stateTestHelpers.js';
import PlayerNewActivePokemon from './PlayerNewActivePokemon.js';

describe('PlayerNewActivePokemon', () => {
  test('only shows alive pokemon in PokemonTeamMenu', () => {
    const ctx = makeContext();
    const fainted = makeMon({ isAlive: jest.fn(() => false), nameWithHP: jest.fn(() => 'Fainted (0/100)') });
    ctx.config.player.team.pokemon = [fainted, ctx.config.player.team.getActivePokemon()];
    new PlayerNewActivePokemon().onEnter.call(ctx);
    // Only 1 alive → populate called with array of length 1
    expect(ctx.PokemonTeamMenu.populate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.anything()]),
      expect.anything()
    );
    expect(ctx.PokemonTeamMenu.populate.mock.calls[0][0]).toHaveLength(1);
  });

  test('selecting a pokemon calls setActivePokemon', () => {
    const ctx = makeContext();
    new PlayerNewActivePokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.config.player.team.setActivePokemon).toHaveBeenCalled();
  });

  test('selecting a pokemon calls remapActivePokemon', () => {
    const ctx = makeContext();
    new PlayerNewActivePokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.remapActivePokemon).toHaveBeenCalled();
  });

  test('selecting a pokemon logs "sent out"', () => {
    const ctx = makeContext();
    new PlayerNewActivePokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('sent out'));
  });

  test('selecting a pokemon transitions to BEFORE_ACTION', () => {
    const ctx = makeContext();
    new PlayerNewActivePokemon().onEnter.call(ctx);
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.stateMachine.setState).toHaveBeenCalledWith('beforeAction');
  });

  test('onExit clears menu and removes listeners', () => {
    const ctx = makeContext();
    const state = new PlayerNewActivePokemon();
    state.onEnter.call(ctx);
    state.onExit.call(ctx);
    expect(ctx.PokemonTeamMenu.clear).toHaveBeenCalled();
    ctx.stateMachine.setState.mockClear();
    ctx.events.emit('pokemonteammenu-select-option-0');
    expect(ctx.stateMachine.setState).not.toHaveBeenCalled();
  });
});
