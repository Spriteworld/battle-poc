import { Abilities, calcTypeEffectiveness, STATUS, TYPES } from '@spriteworld/pokemon-data';
import { applySwitchInAbilities } from '../applyAbilityEffects.js';

export default class PlayerNewActivePokemon {
  onEnter() {
    this.logger.addItem('Choose a Pokémon.');
    this.BattleMenu.select(2);

    const playerTeam   = this.config.player.team;
    const batonPasser  = this.batonPassData?.outgoing ?? null;
    const alivePokemon = Object.values(playerTeam.pokemon).filter(
      pokemon => pokemon.isAlive() && pokemon !== batonPasser
    );

    alivePokemon.forEach((pokemon, idx) => {
      this.events.once('pokemonteammenu-select-option-' + idx, () => {
        this.PokemonTeamMenu.deselect();
        this.PokemonTeamMenu.clear();
        this.PokemonTeamMenu.setVisible(false);

        // Baton Pass: transfer stat stages and passable volatile conditions to the incoming Pokémon.
        if (this.batonPassData) {
          const outgoing = this.batonPassData.outgoing;

          for (const [stat, stage] of Object.entries(outgoing.stages ?? {})) {
            if (stage !== 0 && typeof pokemon.applyStageChange === 'function') {
              pokemon.applyStageChange(stat, stage);
            }
          }

          if (outgoing.volatileStatus && pokemon.volatileStatus) {
            const PASS = ['leechSeed', 'confusedTurns', 'ingrained', 'substitute',
                          'focusEnergy', 'stockpileCount', 'charged', 'aquaRing'];
            for (const key of PASS) {
              const val = outgoing.volatileStatus[key];
              if (val !== undefined && val !== null && val !== false && val !== 0) {
                pokemon.volatileStatus[key] = val;
                outgoing.volatileStatus[key] = typeof val === 'number' ? 0 : (typeof val === 'boolean' ? false : null);
              }
            }
          }

          if (outgoing.volatileStatus) {
            outgoing.volatileStatus.infatuated       = false;
            outgoing.volatileStatus.encored          = null;
            outgoing.volatileStatus.disabledMove     = null;
            outgoing.volatileStatus.furyCutterCount  = 0;
            outgoing.volatileStatus.rolloutCount     = 0;
            outgoing.volatileStatus.trapped          = null;
            outgoing.volatileStatus.nightmare        = false;
            outgoing.volatileStatus.cursed           = false;
            outgoing.volatileStatus.perishSongCount  = 0;
            outgoing.volatileStatus.taunted          = 0;
            outgoing.volatileStatus.tormented        = false;
            outgoing.volatileStatus.identified       = false;
            outgoing.volatileStatus.lockedOn         = false;
            outgoing.volatileStatus.snatching        = false;
            outgoing.volatileStatus.rampaging        = null;
            outgoing.volatileStatus.destinyBond      = false;
            outgoing.volatileStatus.imprisoning      = false;
            outgoing.volatileStatus.grudge           = false;
            outgoing.volatileStatus.uproaring        = null;
            outgoing.volatileStatus.biding           = null;
            outgoing.volatileStatus.defenseCurled    = false;
            outgoing.volatileStatus.transformed      = false;
          }
          // Natural Cure: cure outgoing Pokémon's status on switch-out (baton pass path).
          if (outgoing.hasAbility?.(Abilities.NATURAL_CURE)) {
            if (Object.values(outgoing.status ?? {}).some(v => v > 0)) {
              for (const key of Object.keys(outgoing.status)) outgoing.status[key] = 0;
              if (outgoing.modifiers) outgoing.modifiers.burn = false;
              outgoing.toxicCount = 0;
            }
          }

          this.batonPassData = null;
        }

        this.config.player.team.setActivePokemon(pokemon);
        pokemon.isFirstTurn = true;

        const hazards = this.screens?.player;
        if (hazards && pokemon.isAlive?.()) {
          const monTypes     = pokemon.types ?? [];
          const isFlyingType = monTypes.includes(TYPES.FLYING);
          const isPoisonType = monTypes.includes(TYPES.POISON);
          if (hazards.stealthRock && this.generation?.typeChart) {
            const eff = calcTypeEffectiveness(TYPES.ROCK, monTypes, this.generation.typeChart);
            const dmg = Math.max(1, Math.floor(pokemon.maxHp * eff / 8));
            pokemon.takeDamage(dmg);
            this.logger.addItem(`Pointed stones dug into ${pokemon.getName()}! (${dmg} damage)`);
          }
          if (hazards.spikes > 0 && !isFlyingType) {
            const fracs = [0, 1/8, 1/6, 1/4];
            const dmg = Math.max(1, Math.floor(pokemon.maxHp * fracs[Math.min(3, hazards.spikes)]));
            pokemon.takeDamage(dmg);
            this.logger.addItem(`${pokemon.getName()} was hurt by spikes! (${dmg} damage)`);
          }
          if (hazards.toxicSpikes > 0 && !isFlyingType) {
            if (isPoisonType) {
              hazards.toxicSpikes = 0;
              this.logger.addItem(`${pokemon.getName()} absorbed the toxic spikes!`);
            } else if (pokemon.isAlive?.()) {
              const noStatus = Object.values(pokemon.status ?? {}).every(v => !v);
              if (noStatus) {
                pokemon.status[hazards.toxicSpikes >= 2 ? STATUS.TOXIC : STATUS.POISON] = 1;
                this.logger.addItem(`${pokemon.getName()} was ${hazards.toxicSpikes >= 2 ? 'badly ' : ''}poisoned by toxic spikes!`);
              }
            }
          }
        }

        delete this.actions.player;

        this.logger.addItem(this.config.player.getName() + ' sent out ' + pokemon.getName() + '!');

        const opponent = this.config.enemy.team.getActivePokemon();
        applySwitchInAbilities(pokemon, opponent, this.weather, this.logger, this.generation);

        this.logger.flush(() => {
          this.remapActivePokemon();
          this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
        });
      });
    });

    this.PokemonTeamMenu.populate(alivePokemon, { showCancel: false });
    this.activateMenu(this.PokemonTeamMenu);
  }

  onExit() {
    this.PokemonTeamMenu.deselect();
    this.PokemonTeamMenu.clear();
    this.PokemonTeamMenu.setVisible(false);

    this.events.eventNames().forEach(name => {
      if (name.startsWith('pokemonteammenu-')) this.events.off(name);
    });
  }
}
