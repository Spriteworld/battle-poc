import { ActionTypes, Action } from '@Objects';

export default class PlayerPokemon {
  onEnter() {
    const playerTeam = this.config.player.team;
    const raw        = playerTeam.pokemon;
    const activeIdx  = playerTeam.active;
    // Show the active Pokémon in the hero (first) slot so the ordering reflects
    // the current battle state after any prior switches.
    const pokemon = [raw[activeIdx], ...raw.slice(0, activeIdx), ...raw.slice(activeIdx + 1)];

    this.logger.addItem('Choose a Pokémon.');
    this.BattleMenu.select(2);

    pokemon.forEach((p, idx) => {
      this.events.once('pokemonteammenu-select-option-' + idx, () => {
        this.PokemonTeamMenu.deselect();
        this.PokemonTeamMenu.clear();
        this.PokemonTeamMenu.setVisible(false);

        const active   = this.config.player.team.getActivePokemon();
        const trapData = active?.volatileStatus?.trapped;
        if (trapData) {
          this.logger.addItem(`${active.getName()} is trapped by ${trapData.sourceName} and can't switch!`);
          this.logger.flush(() => this.stateMachine.setState(this.stateDef.PLAYER_ACTION));
          return;
        }
        if (p.id === active.id) {
          this.logger.addItem(`${p.getName()} is already in battle!`);
          this.logger.flush(() => this.stateMachine.setState(this.stateDef.PLAYER_ACTION));
          return;
        }
        if (p.currentHp <= 0) {
          this.logger.addItem(`${p.getName()} has no energy to battle!`);
          this.logger.flush(() => this.stateMachine.setState(this.stateDef.PLAYER_ACTION));
          return;
        }

        this.actions.player = new Action({
          type:   ActionTypes.SWITCH_POKEMON,
          player: this.config.player,
          target: this.config.enemy.team.getActivePokemon(),
          config: { pokemon: p },
        });
        this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
      });
    });

    // Cancel slot
    this.events.once('pokemonteammenu-select-option-' + pokemon.length, () => {
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
    });

    this.PokemonTeamMenu.populate(pokemon);
    this.activateMenu(this.PokemonTeamMenu);
  }

  onExit() {
    this.PokemonTeamMenu.clear();
    this.PokemonTeamMenu.deselect();
    this.PokemonTeamMenu.setVisible(false);

    this.events.eventNames().forEach(name => {
      if (name.startsWith('pokemonteammenu-')) this.events.off(name);
    });
  }
}
