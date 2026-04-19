import { Pokedex, GAMES, getSpeciesDisplayName } from '@spriteworld/pokemon-data';

/**
 * Handles the post-level-up evolution sequence.
 *
 * Launches EvolutionScene as a full-screen overlay for the animation, then applies
 * the species change and routes to the next state.
 *
 * Works through every Pokémon in the player team that has `readyToEvolve` set.
 * When all evolutions are resolved, checks for pending moves (→ LEARN_MOVE),
 * then routes to BEFORE_ACTION or BATTLE_WON depending on whether any enemy
 * Pokémon are still alive.
 */
export default class Evolution {
  onEnter() {
    // Local recursive function — avoids calling setState(EVOLVE) while already
    // in EVOLVE, which the state machine's same-state guard would silently drop.
    const processNext = () => {
      const p = this.config.player.team.pokemon.find(mon => mon.readyToEvolve != null);

      if (!p) {
        const hasPending = this.config.player.team.pokemon.some(
          mon => mon.pendingMovesToLearn?.length > 0
        );
        if (hasPending) {
          this.stateMachine.setState(this.stateDef.LEARN_MOVE);
          return;
        }
        if (this._pendingBattleComplete) {
          const fn = this._pendingBattleComplete;
          this._pendingBattleComplete = null;
          fn();
          return;
        }
        const enemyAlive = this.config.enemy.team.pokemon.some(
          mon => mon.isAlive?.() ?? mon.currentHp > 0
        );
        this.stateMachine.setState(
          enemyAlive ? this.stateDef.BEFORE_ACTION : this.stateDef.BATTLE_WON
        );
        return;
      }

      const fromName = p.getName?.() ?? String(p.species);
      const targetId = p.readyToEvolve;

      let toName;
      try {
        const entry = new Pokedex(p.game ?? GAMES.POKEMON_FIRE_RED).getPokemonById(targetId);
        toName = getSpeciesDisplayName(entry) || `#${targetId}`;
      } catch {
        toName = `#${targetId}`;
      }

      // Flush any pending log messages before the animation takes over.
      this.logger.flush(() => {
        this.scene.launch('EvolutionScene', {
          fromSpecies:    p.species,
          toSpecies:      targetId,
          fromName,
          toName,
          shiny:          p.isShiny  ?? false,
          gender:         p.gender   ?? null,
          tilesetBaseUrl: this.data?.tilesetBaseUrl ?? '',
          canCancel:      false,
          onComplete: (didEvolve) => {
            if (didEvolve) {
              p.evolve(targetId);
              this.remapActivePokemon();
            }
            p.readyToEvolve = null;
            processNext();
          },
        });
      });
    };

    processNext();
  }

  onExit() {}
}
