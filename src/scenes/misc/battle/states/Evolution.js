import { Pokedex, GAMES } from '@spriteworld/pokemon-data';

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
    const p = this.config.player.team.pokemon.find(mon => mon.readyToEvolve != null);

    if (!p) {
      this._finish();
      return;
    }

    const fromName = p.getName?.() ?? String(p.species);
    const targetId = p.readyToEvolve;

    // Look up the evolved form's display name before applying the change.
    let toName;
    try {
      const entry = new Pokedex(p.game ?? GAMES.POKEMON_FIRE_RED).getPokemonById(targetId);
      toName = (entry.species ?? `#${targetId}`).replace(/\b\w/g, c => c.toUpperCase());
    } catch {
      toName = `#${targetId}`;
    }

    // Flush any pending log messages (exp gain, level up text) before the
    // animation takes over the screen.
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
          // Loop — handles multiple simultaneous evolutions (e.g. EXP Share later)
          this.stateMachine.setState(this.stateDef.EVOLVE);
        },
      });
    });
  }

  _finish() {
    const hasPending = this.config.player.team.pokemon.some(
      mon => mon.pendingMovesToLearn?.length > 0
    );
    if (hasPending) {
      this.stateMachine.setState(this.stateDef.LEARN_MOVE);
      return;
    }
    const enemyAlive = this.config.enemy.team.pokemon.some(
      p => p.isAlive?.() ?? p.currentHp > 0
    );
    if (enemyAlive) {
      this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
    } else {
      this.stateMachine.setState(this.stateDef.BATTLE_WON);
    }
  }

  onExit() {}
}
