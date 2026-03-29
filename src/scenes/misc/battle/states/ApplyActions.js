import { ActionTypes } from '@Objects';
import { Abilities, CalcDamage, calcEscape, calcTypeEffectiveness, Moves, STATUS, TYPES } from '@spriteworld/pokemon-data';
import {
  applySwitchInAbilities,
  checkAbilityImmunity,
  applyContactAbilityEffects,
  applyColorChange,
} from '../applyAbilityEffects.js';

const { rollHitCount } = Moves;

/** Synthetic move used for confusion self-damage (40-power Physical Normal). */
const CONFUSION_HIT = {
  name: 'confusion',
  power: 40,
  type: TYPES.NORMAL,
  category: Moves.MOVE_CATEGORIES.PHYSICAL,
  accuracy: null,
};

export default class ApplyActions {
  onEnter() {
    const action = this.currentAction;
    if (!action) {
      console.warn('No current action found, returning to BATTLE_IDLE state');
      this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
      return;
    }

    if (action.type === ActionTypes.USE_ITEM)       return ApplyActions.prototype._applyUseItem.call(this, action);
    if (action.type === ActionTypes.SWITCH_POKEMON)  return ApplyActions.prototype._applySwitchPokemon.call(this, action);
    if (action.type === ActionTypes.RUN)             return ApplyActions.prototype._applyRun.call(this, action);
    if ([ActionTypes.ATTACK, ActionTypes.NPC_ATTACK].includes(action.type))
      return ApplyActions.prototype._applyAttack.call(this, action);
  }

  // ─── Use Item ─────────────────────────────────────────────────────────────

  _applyUseItem(action) {
    let { config, target } = action;
    let item = config.item;
    if (Object.keys(config).includes('item') === false || typeof item !== 'object') {
      console.warn('No item found in action config, returning to BATTLE_IDLE state');
      this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
      return;
    }

    let result = target.useItem(item.item, action);
    this.logger.addItem(result.message);
    if (result.success !== false) item.quantity -= 1;

    this.logger.flush(() => {
      if (target.readyToEvolve != null) {
        this.stateMachine.setState(this.stateDef.EVOLVE);
      } else {
        this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
      }
    });
  }

  // ─── Switch Pokémon ───────────────────────────────────────────────────────

  _applySwitchPokemon(action) {
    let { config, player } = action;
    let pokemon = config.pokemon;
    if (Object.keys(config).includes('pokemon') === false || typeof pokemon !== 'object') {
      console.warn('No pokemon found in action config, returning to BATTLE_IDLE state');
      this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
      return;
    }

    const playerActivePokemon = this.config.player.team.getActivePokemon();
    if (playerActivePokemon?.volatileStatus?.ingrained) {
      this.logger.addItem(`${playerActivePokemon.getName()} is rooted by Ingrain and can't switch out!`);
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      return;
    }
    const trapData = playerActivePokemon?.volatileStatus?.trapped;
    if (trapData) {
      this.logger.addItem(`${playerActivePokemon.getName()} is trapped by ${trapData.sourceName} and can't switch!`);
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      return;
    }

    const enemyActivePokemon = this.config.enemy.team.getActivePokemon();
    const playerTypes = playerActivePokemon?.types ?? [];
    const playerFlying = playerTypes.includes(TYPES.FLYING);
    const playerLevitate = typeof playerActivePokemon?.hasAbility === 'function' &&
      playerActivePokemon.hasAbility(Abilities.LEVITATE);

    let trapAbility = null;
    if (enemyActivePokemon.hasAbility(Abilities.ARENA_TRAP) && !playerFlying && !playerLevitate) {
      trapAbility = 'Arena Trap';
    } else if (enemyActivePokemon.hasAbility(Abilities.SHADOW_TAG) &&
               !playerActivePokemon?.hasAbility?.(Abilities.SHADOW_TAG)) {
      trapAbility = 'Shadow Tag';
    } else if (enemyActivePokemon.hasAbility(Abilities.MAGNET_PULL) &&
               playerTypes.some(t => t === TYPES.STEEL)) {
      trapAbility = 'Magnet Pull';
    }

    if (trapAbility) {
      this.logger.addItem(`${playerActivePokemon.getName()} can't switch out! ${enemyActivePokemon.getName()}'s ${trapAbility} prevents it!`);
      this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      return;
    }

    // Clear volatile status on the outgoing Pokémon before switching.
    const outgoing = player.team.getActivePokemon();
    if (outgoing?.volatileStatus) {
      outgoing.volatileStatus.leechSeed       = false;
      outgoing.volatileStatus.infatuated      = false;
      outgoing.volatileStatus.encored         = null;
      outgoing.volatileStatus.disabledMove    = null;
      outgoing.volatileStatus.furyCutterCount = 0;
      outgoing.volatileStatus.confusedTurns   = 0;
      outgoing.volatileStatus.trapped         = null;
      outgoing.volatileStatus.nightmare       = false;
      outgoing.volatileStatus.cursed          = false;
      outgoing.volatileStatus.focusEnergy     = false;
      outgoing.volatileStatus.perishSongCount = 0;
      outgoing.volatileStatus.taunted         = 0;
      outgoing.volatileStatus.tormented       = false;
      outgoing.volatileStatus.identified      = false;
      outgoing.volatileStatus.lockedOn        = false;
      outgoing.volatileStatus.charged         = false;
      outgoing.volatileStatus.snatching       = false;
      outgoing.volatileStatus.rampaging       = null;
      outgoing.volatileStatus.substitute      = null;
      outgoing.volatileStatus.destinyBond     = false;
      outgoing.volatileStatus.imprisoning     = false;
      outgoing.volatileStatus.grudge          = false;
      outgoing.volatileStatus.protected       = false;
      outgoing.volatileStatus.protectCount    = 0;
      outgoing.volatileStatus.enduring        = false;
      outgoing.volatileStatus.uproaring       = null;
      outgoing.volatileStatus.biding          = null;
      outgoing.volatileStatus.defenseCurled   = false;
      outgoing.volatileStatus.transformed     = false;
      outgoing.volatileStatus.stockpileCount  = 0;
    }

    // Natural Cure: cure the outgoing Pokémon's status on switch-out.
    if (outgoing?.isAlive?.() && outgoing.hasAbility(Abilities.NATURAL_CURE)) {
      const hadStatus = Object.values(outgoing.status ?? {}).some(v => v > 0);
      if (hadStatus) {
        for (const key of Object.keys(outgoing.status)) outgoing.status[key] = 0;
        if (outgoing.modifiers) outgoing.modifiers.burn = false;
        outgoing.toxicCount = 0;
        this.logger.addItem(`${outgoing.getName()}'s status was cured by Natural Cure!`);
      }
    }

    player.team.setActivePokemon(pokemon);
    pokemon.isFirstTurn = true;

    // Apply entry hazards to the incoming Pokémon.
    const switchingSideKey = player.getName().toLowerCase() === 'player' ? 'player' : 'enemy';
    const hazards = this.screens?.[switchingSideKey];
    if (hazards) {
      const monTypes    = pokemon.types ?? [];
      const isFlyingType = monTypes.includes(TYPES.FLYING);
      const isPoisonType = monTypes.includes(TYPES.POISON);

      if (hazards.stealthRock && pokemon.isAlive()) {
        const effectiveness = calcTypeEffectiveness(TYPES.ROCK, monTypes, this.generation?.typeChart);
        const dmg = Math.max(1, Math.floor(pokemon.maxHp * effectiveness / 8));
        pokemon.takeDamage(dmg);
        this.logger.addItem(`Pointed stones dug into ${pokemon.getName()}! (${dmg} damage)`);
      }

      if (hazards.spikes > 0 && !isFlyingType && pokemon.isAlive()) {
        const fractions = [0, 1/8, 1/6, 1/4];
        const fraction  = fractions[Math.min(3, hazards.spikes)];
        const dmg = Math.max(1, Math.floor(pokemon.maxHp * fraction));
        pokemon.takeDamage(dmg);
        this.logger.addItem(`${pokemon.getName()} was hurt by spikes! (${dmg} damage)`);
      }

      if (hazards.toxicSpikes > 0 && !isFlyingType) {
        if (isPoisonType) {
          hazards.toxicSpikes = 0;
          this.logger.addItem(`${pokemon.getName()} absorbed the toxic spikes!`);
        } else if (pokemon.isAlive()) {
          const alreadyHasStatus = Object.values(pokemon.status).some(v => v > 0);
          if (!alreadyHasStatus) {
            if (hazards.toxicSpikes >= 2) {
              pokemon.status[STATUS.TOXIC] = 1;
              this.logger.addItem(`${pokemon.getName()} was badly poisoned by toxic spikes!`);
            } else {
              pokemon.status[STATUS.POISON] = 1;
              this.logger.addItem(`${pokemon.getName()} was poisoned by toxic spikes!`);
            }
          }
        }
      }
    }

    const enemy = player.getName().toLowerCase() === 'player' ? 'enemy' : 'player';
    if (this.actions[enemy]) this.actions[enemy].target = pokemon;

    const switchOppSide = switchingSideKey === 'player' ? 'enemy' : 'player';
    const switchOpponent = this.config[switchOppSide].team.getActivePokemon();
    applySwitchInAbilities(pokemon, switchOpponent, this.weather, this.logger, this.generation);

    this.logger.addItem(`${player.getName()} sent out ${pokemon.getName()}!`);

    this.logger.flush(() => {
      this.remapActivePokemon();
      this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
    });
  }

  // ─── Run ──────────────────────────────────────────────────────────────────

  _applyRun(action) {
    let { player, target } = action;

    this.escapeAttempts += 1;
    const escapingMon = player.team.getActivePokemon();
    const canEscape   = escapingMon.hasAbility(Abilities.RUN_AWAY) || calcEscape(
      escapingMon,
      target.team.getActivePokemon(),
      this.escapeAttempts
    );

    if (canEscape) {
      this.logger.addItem('You successfully ran away!');
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BATTLE_END));
    } else {
      this.logger.addItem("You can't escape!");
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
    }
  }

  // ─── Attack ───────────────────────────────────────────────────────────────

  _applyAttack(action) {
    let { config, target, player, type } = action;
    let info = {};
    let activeMon = player.team.getActivePokemon();

    const attackerKey = player.getName().toLowerCase() === 'player' ? 'player' : 'enemy';
    const defenderKey = attackerKey === 'player' ? 'enemy' : 'player';
    const fieldState  = this.screens[defenderKey];
    const weather     = this.weather ?? null;

    // Pursuit: set pursuiting flag on fieldState when opponent is switching this turn.
    if (config?.move?.name?.toLowerCase() === 'pursuit') {
      fieldState.pursuiting = this.actions[defenderKey]?.type === ActionTypes.SWITCH_POKEMON;
    } else {
      fieldState.pursuiting = false;
    }

    // ── Pre-attack status checks ─────────────────────────────────────────────

    // Paralysis: 25% chance to be unable to move this turn.
    if (activeMon.status?.[STATUS.PARALYZE] > 0 && Math.random() < 0.25) {
      this.logger.addItem(`${activeMon.getName()} is paralyzed! It can't move!`);
      this.currentAction = null;
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    // Insomnia / Vital Spirit: immediately clear sleep if the Pokémon somehow has it.
    if ((activeMon.status?.[STATUS.SLEEP] ?? 0) > 0 &&
        (activeMon.hasAbility(Abilities.INSOMNIA) || activeMon.hasAbility(Abilities.VITAL_SPIRIT))) {
      activeMon.status[STATUS.SLEEP] = 0;
      this.logger.addItem(`${activeMon.getName()} woke up due to its ability!`);
    }

    // Sleep: can't move while asleep; decrement counter and check for wake-up.
    // Early Bird wakes up twice as fast.
    if (activeMon.status?.[STATUS.SLEEP] > 0) {
      const sleepDecrement = activeMon.hasAbility(Abilities.EARLY_BIRD) ? 2 : 1;
      activeMon.status[STATUS.SLEEP] = Math.max(0, activeMon.status[STATUS.SLEEP] - sleepDecrement);
      if (activeMon.status[STATUS.SLEEP] === 0) {
        this.logger.addItem(`${activeMon.getName()} woke up!`);
        // Falls through — Pokémon acts normally on the wake-up turn.
      } else {
        // Sleep Talk — pick a random known move and execute it this turn.
        if (config?.move?.name?.toLowerCase() === 'sleep talk') {
          const allMoves = (typeof activeMon.getMoves === 'function' ? activeMon.getMoves() : activeMon.moves) ?? [];
          const eligible = allMoves.filter(m => m.name?.toLowerCase() !== 'sleep talk' && (m.pp?.current ?? 1) > 0);
          if (eligible.length > 0) {
            config = { ...config, move: eligible[Math.floor(Math.random() * eligible.length)] };
            // Falls through — execute the randomly chosen move while still asleep.
          } else {
            this.logger.addItem(`${activeMon.getName()} is fast asleep!`);
            this.currentAction = null;
            this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
            return;
          }
        } else {
          this.logger.addItem(`${activeMon.getName()} is fast asleep!`);
          this.currentAction = null;
          this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
          return;
        }
      }
    }

    // Freeze: 20% thaw chance per turn; still frozen → can't move.
    if (activeMon.status?.[STATUS.FROZEN] > 0) {
      if (Math.random() < 0.20) {
        activeMon.status[STATUS.FROZEN] = 0;
        this.logger.addItem(`${activeMon.getName()} thawed out!`);
        // Falls through — Pokémon acts normally on the thaw turn.
      } else {
        this.logger.addItem(`${activeMon.getName()} is frozen solid!`);
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }
    }

    // Infatuation (Attract): 50% chance to be immobilised by love.
    // Oblivious is immune to infatuation; clear it if somehow applied.
    if (activeMon.volatileStatus?.infatuated && activeMon.hasAbility(Abilities.OBLIVIOUS)) {
      activeMon.volatileStatus.infatuated = false;
    }
    if (activeMon.volatileStatus?.infatuated) {
      if (Math.random() < 0.50) {
        this.logger.addItem(`${activeMon.getName()} is immobilized by love!`);
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }
    }

    // Confusion: 50% chance to hit self; counter decrements each turn.
    // Own Tempo prevents confusion entirely.
    if (activeMon.hasAbility(Abilities.OWN_TEMPO)) {
      activeMon.volatileStatus.confusedTurns = 0;
    }
    if ((activeMon.volatileStatus?.confusedTurns ?? 0) > 0) {
      this.logger.addItem(`${activeMon.getName()} is confused!`);
      if (Math.random() < 0.5) {
        const selfInfo = CalcDamage.calculate(activeMon, activeMon, CONFUSION_HIT, { stab: 1, typeEffectiveness: 1 }, this.generation);
        const selfDmg  = Math.max(1, selfInfo.damage || 0);
        activeMon.takeDamage(selfDmg);
        this.logger.addItem(`It hurt itself in its confusion! (${selfDmg} damage)`);
        activeMon.volatileStatus.confusedTurns--;
        if (activeMon.volatileStatus.confusedTurns === 0) {
          this.logger.addItem(`${activeMon.getName()} snapped out of its confusion!`);
        }
        this.currentAction = null;
        this.logger.flush(() => {
          this.remapActivePokemon();
          this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
        });
        return;
      }
      activeMon.volatileStatus.confusedTurns--;
      if (activeMon.volatileStatus.confusedTurns === 0) {
        this.logger.addItem(`${activeMon.getName()} snapped out of its confusion!`);
      }
    }

    // Taunt: prevent STATUS category moves while taunted.
    if ((activeMon.volatileStatus?.taunted ?? 0) > 0) {
      const move = config?.move;
      if (move && move.category === Moves.MOVE_CATEGORIES.STATUS) {
        this.logger.addItem(`${activeMon.getName()} can't use ${move.name} due to the taunt!`);
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }
    }

    // Torment: prevent using the same move twice in a row.
    if (activeMon.volatileStatus?.tormented) {
      const move = config?.move;
      if (move && activeMon.lastUsedMove?.name === move.name) {
        this.logger.addItem(`${activeMon.getName()} can't use ${move.name} due to torment!`);
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }
    }

    // Imprison: if the opponent sealed moves the user knows, block them.
    if (target.volatileStatus?.imprisoning && config?.move) {
      const moveName = config.move.name?.toLowerCase();
      const oppMoves = (typeof target.getMoves === 'function' ? target.getMoves() : target.moves) ?? [];
      if (oppMoves.some(m => m.name?.toLowerCase() === moveName)) {
        this.logger.addItem(`${activeMon.getName()} can't use ${config.move.name}! It's imprisoned!`);
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }
    }

    // Protect / Detect: if the target used Protect/Detect this turn, block all attacks.
    if (target.volatileStatus?.protected) {
      this.logger.addItem(`${target.getName()} was protected!`);
      // Explosion and Self-Destruct always faint the user even through Protect (Gen 3).
      const moveName = config?.move?.name?.toLowerCase() ?? '';
      if (moveName === 'explosion' || moveName === 'self-destruct') {
        activeMon.takeDamage(activeMon.currentHp);
        this.logger.addItem(`${activeMon.getName()} fainted!`);
      }
      this.currentAction = null;
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    // Focus Punch: fails if the user took damage this turn before their move.
    if (config?.move?.name?.toLowerCase() === 'focus punch' && activeMon._lastReceivedDamage) {
      this.logger.addItem(`${activeMon.getName()} lost its focus and couldn't move!`);
      this.currentAction = null;
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    // Flinch: set by a faster move that hit this Pokémon earlier this round.
    // Inner Focus prevents flinching.
    if (activeMon.flinched && activeMon.hasAbility(Abilities.INNER_FOCUS)) {
      activeMon.flinched = false;
    }
    if (activeMon.flinched) {
      activeMon.flinched = false;
      this.logger.addItem(`${activeMon.getName()} flinched and couldn't move!`);
      this.currentAction = null;
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    // Truant: skip every other turn; alternates between loafing and acting.
    if (activeMon.hasAbility(Abilities.TRUANT)) {
      if (activeMon.volatileStatus.truantLoaf) {
        activeMon.volatileStatus.truantLoaf = false;
        this.logger.addItem(`${activeMon.getName()} is loafing around!`);
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }
      activeMon.volatileStatus.truantLoaf = true;
    }

    // If the target is invulnerable on their charge turn, the attack fails.
    if (target.invulnerable) {
      const moveLabel = (type === ActionTypes.ATTACK && config?.move)
        ? ` used ${config.move.name} but`
        : ' attacked, but';
      this.logger.addItem(`${activeMon.getName()}${moveLabel} it failed!`);
      this.currentAction = null;
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    let rampageEnded = false;

    // Snapshot both sides' status before the attack for Synchronize detection.
    const _syncTargetStatusBefore = {
      [STATUS.BURN]:    (target.status?.[STATUS.BURN]    ?? 0) > 0,
      [STATUS.POISON]:  (target.status?.[STATUS.POISON]  ?? 0) > 0,
      [STATUS.PARALYZE]:(target.status?.[STATUS.PARALYZE]?? 0) > 0,
      [STATUS.TOXIC]:   (target.status?.[STATUS.TOXIC]   ?? 0) > 0,
    };
    // Bide — charge or release turn.
    if (type === ActionTypes.ATTACK && activeMon.volatileStatus?.biding) {
      const bide = activeMon.volatileStatus.biding;
      bide.turnsLeft--;
      if (bide.turnsLeft > 0) {
        this.logger.addItem(`${activeMon.getName()} is storing energy!`);
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }
      // Release — deal 2× accumulated damage.
      const releaseDmg = bide.damageAccumulated * 2;
      activeMon.volatileStatus.biding = null;
      if (releaseDmg > 0) {
        target.takeDamage(releaseDmg);
        this.logger.addItem(`${activeMon.getName()} unleashed its energy! (${releaseDmg} damage)`);
      } else {
        this.logger.addItem(`${activeMon.getName()} unleashed energy, but it failed!`);
      }
      this.currentAction = null;
      this.logger.flush(() => {
        this.remapActivePokemon();
        this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
      });
      return;
    }

    // ── Attack execution ─────────────────────────────────────────────────────

    switch (type) {
      case ActionTypes.ATTACK: {
        let move = config.move;

        // Uproar continuation — locked into Uproar move for additional turns.
        if (activeMon.volatileStatus?.uproaring) {
          const uproarState = activeMon.volatileStatus.uproaring;
          move = uproarState.move;
          uproarState.turnsLeft--;
          if (uproarState.turnsLeft <= 0) activeMon.volatileStatus.uproaring = null;
          info = activeMon.attackLocked(target, move, this.generation, fieldState, weather);
          break;
        }

        // Rampage continuation (Thrash / Outrage / Petal Dance) — force the locked move.
        if (activeMon.volatileStatus?.rampaging) {
          const ramp = activeMon.volatileStatus.rampaging;
          move = ramp.move;
          ramp.turnsLeft--;
          if (ramp.turnsLeft <= 0) rampageEnded = true;
          info = activeMon.attackLocked(target, move, this.generation, fieldState, weather);
          break;
        }

        if (!move || typeof move !== 'object') {
          console.warn('No move found in action config, returning to BATTLE_IDLE state');
          this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
          return;
        }

        // Assist — pick a random eligible move from a party member and use it instead.
        if (move.name?.toLowerCase() === 'assist') {
          const ASSIST_BANNED = new Set([
            'assist', 'counter', 'covet', 'destiny bond', 'detect', 'endure',
            'focus punch', 'follow me', 'helping hand', 'metronome', 'mirror coat',
            'mirror move', 'protect', 'sketch', 'sleep talk', 'snatch', 'struggle',
            'thief', 'transform',
          ]);
          const partyMoves = [];
          for (const member of (activeMon.team?.pokemon ?? [])) {
            if (member === activeMon) continue;
            const memberMoves = (typeof member.getMoves === 'function' ? member.getMoves() : member.moves) ?? [];
            for (const m of memberMoves) {
              if (m && !ASSIST_BANNED.has(m.name?.toLowerCase())) partyMoves.push(m);
            }
          }
          if (partyMoves.length > 0) {
            move = partyMoves[Math.floor(Math.random() * partyMoves.length)];
          } else {
            this.logger.addItem('But it failed!');
            this.currentAction = null;
            this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
            return;
          }
        }

        // Snatch — if the opponent used Snatch and the current move is snatchable,
        // the opponent steals the effect and applies it to themselves instead.
        {
          const SNATCHABLE = new Set([
            'swords dance', 'agility', 'harden', 'barrier', 'amnesia',
            'calm mind', 'bulk up', 'dragon dance', 'nasty plot',
            'iron defense', 'stockpile', 'recover', 'rest', 'soft-boiled',
            'milk drink', 'slack off', 'moonlight', 'morning sun', 'synthesis',
            'ingrain', 'focus energy', 'safeguard', 'light screen', 'reflect',
            'mist', 'wish', 'aromatherapy', 'heal bell', 'refresh',
            'belly drum', 'meditate', 'minimize', 'cosmic power',
            'growth', 'acid armor', 'withdraw', 'defense curl',
          ]);
          const moveName = move.name?.toLowerCase();
          if (target.volatileStatus?.snatching && SNATCHABLE.has(moveName)) {
            target.volatileStatus.snatching = false;
            this.logger.addItem(`${target.getName()} snatched ${move.name}!`);
            const snatched = typeof move.onEffect === 'function'
              ? move.onEffect.call(move, target, activeMon, { damage: 0 })
              : null;
            if (snatched?.message) this.logger.addItem(snatched.message);
            this.currentAction = null;
            this.logger.flush(() => {
              this.remapActivePokemon();
              this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
            });
            return;
          }
        }

        // Check if this is the charge turn of a two-turn move.
        // Solar Beam skips its charge turn in harsh sunlight.
        const multiTurnDef = move.multiTurn ?? null;
        const solarBeamInSun = this.generation.gen >= 3 &&
          move.name?.toLowerCase() === 'solar beam' && weather?.type === 'sun';
        if (multiTurnDef && !activeMon.lockedMove && !solarBeamInSun) {
          move.pp.current = Math.max(0, move.pp.current - 1);
          activeMon.isFirstTurn = false;
          this.logger.addItem(multiTurnDef.chargeMessage.replace('{name}', activeMon.getName()));
          if (typeof move.onCharge === 'function') {
            const chargeResult = move.onCharge(activeMon);
            if (chargeResult?.message) this.logger.addItem(chargeResult.message);
          }
          activeMon.lockedMove = { move, invulnerable: multiTurnDef.invulnerable };
          activeMon.invulnerable = multiTurnDef.invulnerable;
          this.currentAction = null;
          this.logger.flush(() => {
            this.remapActivePokemon();
            this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
          });
          return;
        }

        // Ability-based type immunity (Levitate, Flash Fire, Volt Absorb, Water Absorb, Dry Skin).
        if ((move.power ?? 0) > 0) {
          const immunityMsg = checkAbilityImmunity(target, move, weather);
          if (immunityMsg) {
            this.logger.addItem(`${activeMon.getName()} uses ${move.name} against ${target.getName()}`);
            this.logger.addItem(immunityMsg);
            if (move.pp) move.pp.current = Math.max(0, move.pp.current - 1);
            activeMon.isFirstTurn = false;
            activeMon.lastUsedMove = move;
            this.currentAction = null;
            this.logger.flush(() => {
              this.remapActivePokemon();
              this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
            });
            return;
          }
        }

        // Brick Break — clears defender's screens before dealing damage.
        if (move.name?.toLowerCase() === 'brick break') {
          if (fieldState.reflect > 0) {
            fieldState.reflect = 0;
            this.logger.addItem(`${activeMon.getName()} broke through Reflect!`);
          }
          if (fieldState.lightScreen > 0) {
            fieldState.lightScreen = 0;
            this.logger.addItem(`${activeMon.getName()} broke through Light Screen!`);
          }
        }

        // Strike turn (or a regular move): clear locked state then attack.
        if (activeMon.lockedMove) {
          activeMon.lockedMove = null;
          activeMon.invulnerable = false;
          info = activeMon.attackLocked(target, move, this.generation, fieldState, weather);
        } else {
          const multiHitDef = move.multiHit ?? null;
          if (multiHitDef) {
            const hitCount = rollHitCount(multiHitDef.minHits, multiHitDef.maxHits);
            info = activeMon.attackMultiHit(target, move, this.generation, hitCount, multiHitDef.powers ?? null, fieldState, weather);
          } else {
            info = activeMon.attack(target, move, this.generation, fieldState, weather);
          }
        }
        break;
      }
      case ActionTypes.NPC_ATTACK:
        info = activeMon.attackWithAI(target, this.generation, fieldState, weather);
        break;
    }

    // ── Post-attack resolution ────────────────────────────────────────────────

    let attackMessage = [];
    attackMessage.push(
      config?.move?.selfTarget
        ? `${activeMon.getName()} uses ${info.move}`
        : [activeMon.getName(), 'uses', info.move, 'against', info.enemy].join(' ')
    );

    if (info.reflected) {
      attackMessage.push(`${info.enemy} bounced the move back with Magic Coat!`);
    }

    if (info.accuracy === 0) {
      if (info.disabled) {
        attackMessage.push(`${activeMon.getName()}'s ${info.move} is disabled!`);
      } else if (info.failed) {
        attackMessage.push('But it failed!');
      } else {
        attackMessage.push('It totally missed!');
      }
      if (info.crashDamage > 0) {
        attackMessage.push(`${activeMon.getName()} kept going and crashed!`);
      }
      this.logger.addItem(attackMessage.join('\n'));
      this.currentAction = null;
      this.logger.flush(() => {
        this.remapActivePokemon();
        this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
      });
      return;
    }

    if (info.magnitudeLevel !== undefined) {
      attackMessage.push(`Magnitude ${info.magnitudeLevel}!`);
    }

    if (Array.isArray(info.hitResults) && info.hitResults.length > 0) {
      info.hitResults.forEach(({ damage, critical }, i) => {
        if (damage > 0) attackMessage.push(`   Hit ${i + 1}: ${damage} damage!`);
        if (critical > 1) attackMessage.push('A critical hit!');
      });
      attackMessage.push(`Hit ${info.hits} time${info.hits === 1 ? '' : 's'}!`);
    } else {
      if (info.damage > 0) {
        attackMessage.push(['   for', info.damage, '('+ action.target.currentHp+')', 'damage!'].join(' '));
      }
      if (info.critical > 1) {
        attackMessage.push('It was a critical hit!');
      }
    }
    this.logger.addItem(attackMessage.join('\n'));
    
    switch (info.typeEffectiveness) {
      case 2:
      case 4:
        this.logger.addItem('It was super effective!');
        break;
      case 0.5:
        this.logger.addItem('It wasnt very effective!');
        break;
      case 0:
        this.logger.addItem('It has no effect!');
        break;
    }

    if (info.screenReduced === 'reflect') {
      this.logger.addItem('Reflect weakened the damage!');
    } else if (info.screenReduced === 'lightScreen') {
      this.logger.addItem('Light Screen weakened the damage!');
    }

    if (info.effect?.message) {
      this.logger.addItem(info.effect.message);
    }

    if (info.damage === 0 && !info.effect && info.typeEffectiveness !== 0) {
      this.logger.addItem('It had no effect!');
    }

    // Pressure — opponent's move costs an extra PP.
    if (target.hasAbility(Abilities.PRESSURE) && config?.move?.pp) {
      config.move.pp.current = Math.max(0, config.move.pp.current - 1);
      this.logger.addItem(`${target.getName()}'s Pressure reduced PP!`);
    }

    // Contact ability effects (Static, Flame Body, Poison Point, Rough Skin, etc.).
    if ((info.damage ?? 0) > 0 && config?.move) {
      applyContactAbilityEffects(activeMon, target, config.move, info, this.logger, this.generation);
      applyColorChange(target, config.move, this.logger);
    }

    // Skill Swap — swap abilities between attacker and defender.
    if (info.effect?.skillSwap) {
      const tempAbility = activeMon.ability;
      activeMon.ability = target.ability;
      target.ability    = tempAbility;
      this.logger.addItem(`${activeMon.getName()} swapped abilities with ${target.getName()}!`);
    }

    // Role Play — copy the target's ability.
    if (info.effect?.rolePlay) {
      activeMon.ability = { ...target.ability };
      this.logger.addItem(`${activeMon.getName()} copied ${target.getName()}'s ${target.ability.name}!`);
    }

    // Light Screen / Reflect — set on the attacker's side for 5 turns.
    if (info.effect?.lightScreen) {
      this.screens[attackerKey].lightScreen = 5;
      this.logger.addItem(`${activeMon.getName()} put up a Light Screen!`);
    }
    if (info.effect?.reflect) {
      this.screens[attackerKey].reflect = 5;
      this.logger.addItem(`${activeMon.getName()} put up a Reflect!`);
    }

    // Weather — set a 5-turn weather condition on the field.
    if (info.effect?.setWeather) {
      const wType = info.effect.setWeather;
      const gen   = this.generation.gen ?? 3;
      const weatherAllowed = gen >= 2 && (wType !== 'hail' || gen >= 3);
      if (weatherAllowed) {
        const WEATHER_START = {
          rain:      'A heavy rain began to fall!',
          sun:       'The sunlight turned harsh!',
          sandstorm: 'A sandstorm brewed!',
          hail:      'It started to hail!',
        };
        this.weather.type      = wType;
        this.weather.turnsLeft = 5;
        this.logger.addItem(WEATHER_START[wType] ?? 'The weather changed!');
      }
    }

    // Baton Pass — force the player to switch, passing stages + leech seed.
    if (info.effect?.batonPass) {
      this.batonPassData = { outgoing: activeMon };
      this.currentAction = null;
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.PLAYER_NEW_ACTIVE_POKEMON));
      return;
    }

    // Mist — set mist protection on attacker's side for 5 turns.
    if (info.effect?.setMist) {
      if (!this.screens[attackerKey].mist) {
        this.screens[attackerKey].mist = 5;
        this.logger.addItem(`${activeMon.getName()} is protected by mist!`);
      } else {
        this.logger.addItem('But it failed!');
      }
    }

    // Safeguard — set safeguard on attacker's side for 5 turns.
    if (info.effect?.setSafeguard) {
      if (!this.screens[attackerKey].safeguard) {
        this.screens[attackerKey].safeguard = 5;
        this.logger.addItem(`${activeMon.getName()} is protected by Safeguard!`);
      } else {
        this.logger.addItem('But it failed!');
      }
    }

    // Present — show healing message if target was healed.
    if (info.presentHeal > 0) {
      this.logger.addItem(`${target.getName()} was healed by ${info.presentHeal} HP!`);
    }

    // Charged — clear charged flag after using an Electric-type move.
    if (activeMon.volatileStatus?.charged && config?.move?.type === TYPES.ELECTRIC) {
      activeMon.volatileStatus.charged = false;
    }

    // Rampage (Thrash / Outrage / Petal Dance) — lock into the move for additional turns.
    if (info.effect?.startRampage) {
      activeMon.volatileStatus.rampaging = { move: config.move, turnsLeft: info.effect.startRampage };
    }
    if (rampageEnded) {
      activeMon.volatileStatus.rampaging = null;
      if ((activeMon.volatileStatus?.confusedTurns ?? 0) === 0 &&
          !activeMon.hasAbility(Abilities.OWN_TEMPO)) {
        activeMon.volatileStatus.confusedTurns = Math.floor(Math.random() * 4) + 2;
        this.logger.addItem(`${activeMon.getName()} became confused due to fatigue!`);
      }
    }

    // Substitute — show a message when the substitute breaks.
    if (info.substituteBroke) {
      this.logger.addItem(`${target.getName()}'s substitute broke!`);
    }

    // Endure — target survived with 1 HP.
    if (info.endured) {
      this.logger.addItem(`${target.getName()} endured the hit!`);
    }

    // Destiny Bond — if the target fainted holding Destiny Bond, the attacker also faints.
    if (target.currentHp <= 0 && target.volatileStatus?.destinyBond) {
      activeMon.takeDamage(activeMon.currentHp);
      this.logger.addItem(`${activeMon.getName()} was taken down with ${target.getName()}!`);
    }

    // Grudge — if the target fainted holding Grudge, the killing move loses all its PP.
    if (target.currentHp <= 0 && target.volatileStatus?.grudge && config?.move) {
      config.move.pp.current = 0;
      this.logger.addItem(`${config.move.name}'s PP was reduced to 0 by Grudge!`);
    }

    // Entry hazards (Spikes / Toxic Spikes / Stealth Rock) — stored on the defender's side.
    if (info.effect?.setHazard) {
      const hazardSide = this.screens[defenderKey];
      const hazardType = info.effect.setHazard;
      if (hazardType === 'spikes') {
        if (hazardSide.spikes < 3) {
          hazardSide.spikes++;
          this.logger.addItem(`Spikes were scattered on ${defenderKey === 'player' ? 'your' : "the enemy's"} side! (Layer ${hazardSide.spikes})`);
        } else {
          this.logger.addItem('But it failed! Spikes are already at max layers.');
        }
      } else if (hazardType === 'toxicSpikes') {
        if (hazardSide.toxicSpikes < 2) {
          hazardSide.toxicSpikes++;
          this.logger.addItem(`Toxic spikes were scattered on ${defenderKey === 'player' ? 'your' : "the enemy's"} side! (Layer ${hazardSide.toxicSpikes})`);
        } else {
          this.logger.addItem('But it failed! Toxic spikes are already at max layers.');
        }
      } else if (hazardType === 'stealthRock') {
        if (!hazardSide.stealthRock) {
          hazardSide.stealthRock = true;
          this.logger.addItem(`Pointed stones float in the air on ${defenderKey === 'player' ? 'your' : "the enemy's"} side!`);
        } else {
          this.logger.addItem('But it failed! Stealth Rock is already in place.');
        }
      }
    }

    // Rapid Spin — clear entry hazards on the attacker's side.
    if (info.effect?.rapidSpinClear) {
      const spinSide = this.screens[attackerKey];
      spinSide.spikes = 0;
      spinSide.toxicSpikes = 0;
      spinSide.stealthRock = false;
    }

    // Conversion 2 — change user's type to one that resists the last move type they received.
    if (info.effect?.conversion2) {
      const resistedType = info.effect.conversion2;
      const allTypes     = Object.values(TYPES).filter(t => typeof t === 'string');
      const resisting    = allTypes.filter(t => {
        const eff = calcTypeEffectiveness(resistedType, [t], this.generation?.typeChart);
        return eff < 1;
      });
      if (resisting.length > 0) {
        activeMon.types = [resisting[Math.floor(Math.random() * resisting.length)]];
        this.logger.addItem(`${activeMon.getName()} transformed into the ${activeMon.types[0]} type!`);
      } else {
        this.logger.addItem('But it failed!');
      }
    }

    // Destiny Bond — user activates their Destiny Bond flag.
    // Retaliation (target fainted → attacker faints) is handled separately below.
    if (info.effect?.destinyBond) {
      activeMon.volatileStatus.destinyBond = true;
      this.logger.addItem(`${activeMon.getName()} made a destiny bond!`);
    }

    // Spite — permanently reduce the PP of the target's last used move by 4.
    if (info.effect?.spite != null) {
      const lastMove  = target.lastUsedMove;
      const ppReduce  = typeof info.effect.spite === 'number' ? info.effect.spite : 4;
      if (lastMove?.pp && lastMove.pp.current > 0) {
        lastMove.pp.current = Math.max(0, lastMove.pp.current - ppReduce);
        this.logger.addItem(`${lastMove.name}'s PP was reduced by ${ppReduce}!`);
      } else {
        this.logger.addItem('But it failed!');
      }
    }

    // Defense Curl — set flag so Rollout/Ice Ball deal double power this battle (Gen 3).
    if (info.effect?.defenseCurl) {
      activeMon.volatileStatus.defenseCurled = true;
    }

    // Transform — copy the target's types, moves (5 PP each), and battle stats.
    if (info.effect?.transform) {
      activeMon.types = [...(target.types ?? [])];
      activeMon.moves = (target.moves ?? []).map(m => ({
        name:     m.name,
        type:     m.type,
        category: m.category,
        power:    m.power,
        accuracy: m.accuracy,
        pp:       { max: 5, current: 5 },
      }));
      const COPY_STATS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed'];
      for (const stat of COPY_STATS) {
        if (target._baseStats?.[stat] != null) activeMon._baseStats[stat] = target._baseStats[stat];
        if (target.stats?.[stat]      != null) activeMon.stats[stat]      = target.stats[stat];
      }
      for (const [stat, stage] of Object.entries(target.stages ?? {})) {
        activeMon.stages[stat] = stage;
      }
      activeMon.volatileStatus.transformed = true;
      this.logger.addItem(`${activeMon.getName()} transformed!`);
    }

    // Uproar — lock the user into Uproar for additional turns.
    if (info.effect?.startUproar) {
      activeMon.volatileStatus.uproaring = { move: config.move, turnsLeft: info.effect.startUproar };
    }

    // Force switch (Roar / Whirlwind) — blow the target away; replace with a random party member.
    // Ingrain roots the target and prevents forced switch-out (Gen 3).
    if (info.effect?.forceSwitch) {
      if (target.volatileStatus?.ingrained) {
        this.logger.addItem(`${target.getName()} is rooted by Ingrain and can't be blown away!`);
      } else {
        const bench = (target.team?.pokemon ?? []).filter(p => p !== target && p.isAlive && p.isAlive());
        if (bench.length > 0) {
          const replacement = bench[Math.floor(Math.random() * bench.length)];
          target.team.setActivePokemon(replacement);
          replacement.isFirstTurn = true;
          this.logger.addItem(`${target.getName()} was blown away! Go, ${replacement.getName()}!`);
          if (this.actions[defenderKey]) this.actions[defenderKey].target = replacement;
        } else {
          this.logger.addItem(`${target.getName()} has nowhere to go!`);
        }
      }
    }

    // Synchronize — when a status is inflicted on a Pokémon with Synchronize, pass it back
    // to the attacker. Toxic is reflected as regular Poison. Skips if attacker already has
    // a status condition. (Gen 3: BRN / PSN / PAR / TOXIC trigger Synchronize.)
    if (typeof target.hasAbility === 'function' && target.hasAbility(Abilities.SYNCHRONIZE)) {
      const syncKeys = [STATUS.BURN, STATUS.POISON, STATUS.PARALYZE, STATUS.TOXIC];
      for (const key of syncKeys) {
        const targetGotStatus = !_syncTargetStatusBefore[key] && (target.status?.[key] ?? 0) > 0;
        if (targetGotStatus) {
          const attackerHasStatus = Object.values(activeMon.status ?? {}).some(v => v > 0);
          if (!attackerHasStatus) {
            // Toxic is passed back as regular Poison in Gen 3.
            const applyKey = key === STATUS.TOXIC ? STATUS.POISON : key;
            activeMon.status[applyKey] = 1;
            const statusName = {
              [STATUS.BURN]:    'burned',
              [STATUS.POISON]:  'poisoned',
              [STATUS.PARALYZE]:'paralyzed',
              [STATUS.TOXIC]:   'poisoned',
            }[key];
            this.logger.addItem(`${activeMon.getName()} was ${statusName} by ${target.getName()}'s Synchronize!`);
          }
          break;
        }
      }
    }

    this.currentAction = null;
    this.logger.flush(() => {
      this.remapActivePokemon();
      this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
    });
  }
}
