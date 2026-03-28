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
    // // console.log('[ApplyActions] onEnter');

    let action = this.currentAction;
    if (!action) {
      console.warn('[ApplyActions] No current action found, returning to BATTLE_IDLE state');
      this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
      return;
    }
    // // console.log('[ApplyActions] currentAction', action);

    // if player selects an item
      // is item a pokeball?
        // if so, check if wild pokemon
        // if so, apply catch logic
        // if caught, go to BATTLE_END state else APPLY_ACTIONS state
      // is item a healing / pokedoll, apply item effects
    if (action.type === ActionTypes.USE_ITEM) {
      let { config, target } = action;
      let item = config.item;
      if (Object.keys(config).includes('item') === false || typeof item !== 'object') {
        console.warn('[ApplyActions] No item found in action config, returning to BATTLE_IDLE state');
        this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
        return;
      }
      // // console.log('[ApplyActions] Using item:', item);

      // apply item effects, e.g. healing, status curing, etc
      let result = target.useItem(item.item, action);
      this.logger.addItem(result.message);

      item.quantity -= 1;
      // if (item.quantity <= 0) {
      //   this.data.player.inventory.items.splice(itemIndex, 1);
      // }

      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    // if player selects a pokemon
    if (action.type === ActionTypes.SWITCH_POKEMON) {
      let { config, player } = action;
      let pokemon = config.pokemon;
      if (Object.keys(config).includes('pokemon') === false || typeof pokemon !== 'object') {
        console.warn('[ApplyActions] No pokemon found in action config, returning to BATTLE_IDLE state');
        this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
        return;
      }

      let enemyActivePokemon = this.config.enemy.team.getActivePokemon();
      console.log('[ApplyActions] enemy pokemon:', enemyActivePokemon);
      // check to see if enemy or field has an ability to stop (e.g. Arena Trap)
      // if so, show message and go back to PLAYER_ACTION state
      const playerActivePokemon = this.config.player.team.getActivePokemon();
      const trapData = playerActivePokemon?.volatileStatus?.trapped;
      if (trapData) {
        this.logger.addItem(`${playerActivePokemon.getName()} is trapped by ${trapData.sourceName} and can't switch!`);
        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
        return;
      }

      let canStopSwitch = [
        enemyActivePokemon.hasAbility(Abilities.ARENA_TRAP),
        enemyActivePokemon.hasAbility(Abilities.SHADOW_TAG),
        enemyActivePokemon.hasAbility(Abilities.MAGNET_PULL),
      ].includes(true);
      if (canStopSwitch) {

        this.stateMachine.setState(this.stateDef.PLAYER_ACTION);

      // if not, switch pokemon
      } else {

        this.logger.addItem('[ApplyActions] Switching pokemon: ' + pokemon.getName());

        // Clear volatile status on the outgoing Pokémon before switching.
        const outgoing = player.team.getActivePokemon();
        if (outgoing?.volatileStatus) {
          outgoing.volatileStatus.leechSeed       = false;
          outgoing.volatileStatus.infatuated      = false;
          outgoing.volatileStatus.encored         = null;
          outgoing.volatileStatus.disabledMove    = null;
          outgoing.volatileStatus.furyCutterCount  = 0;
          outgoing.volatileStatus.confusedTurns   = 0;
          outgoing.volatileStatus.trapped         = null;
          outgoing.volatileStatus.nightmare       = false;
          outgoing.volatileStatus.cursed          = false;
          outgoing.volatileStatus.focusEnergy     = false;
          outgoing.volatileStatus.perishSongCount  = 0;
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

        // switch pokemon
        player.team.setActivePokemon(pokemon);
        pokemon.isFirstTurn = true;

        // Apply entry hazards to the incoming Pokémon.
        const switchingSideKey = player.getName().toLowerCase() === 'player' ? 'player' : 'enemy';
        const hazards = this.screens?.[switchingSideKey];
        if (hazards) {
          const monTypes = pokemon.types ?? [];
          const isFlyingType = monTypes.includes(TYPES.FLYING);
          const isPoisonType = monTypes.includes(TYPES.POISON);

          // Stealth Rock — damage scaled by Rock-type effectiveness.
          if (hazards.stealthRock && pokemon.isAlive()) {
            const effectiveness = calcTypeEffectiveness(TYPES.ROCK, monTypes, this.generation?.typeChart);
            const dmg = Math.max(1, Math.floor(pokemon.maxHp * effectiveness / 8));
            pokemon.takeDamage(dmg);
            this.logger.addItem(`Pointed stones dug into ${pokemon.getName()}! (${dmg} damage)`);
          }

          // Spikes — 1/8 / 1/6 / 1/4 HP per layer; Flying-types are immune.
          if (hazards.spikes > 0 && !isFlyingType && pokemon.isAlive()) {
            const fractions = [0, 1/8, 1/6, 1/4];
            const fraction = fractions[Math.min(3, hazards.spikes)];
            const dmg = Math.max(1, Math.floor(pokemon.maxHp * fraction));
            pokemon.takeDamage(dmg);
            this.logger.addItem(`${pokemon.getName()} was hurt by spikes! (${dmg} damage)`);
          }

          // Toxic Spikes — Poison-types absorb them; others get poisoned.
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

        let enemy = player.getName().toLowerCase() === 'player' ? 'enemy' : 'player';
        console.log('[ApplyActions] Setting action target for', enemy, 'to', pokemon.getName());
        this.actions[enemy].target = pokemon;

        this.remapActivePokemon();

        // Trigger switch-in ability effects for the newly active Pokémon.
        const switchSide    = player.getName().toLowerCase() === 'player' ? 'player' : 'enemy';
        const switchOppSide = switchSide === 'player' ? 'enemy' : 'player';
        const switchOpponent = this.config[switchOppSide].team.getActivePokemon();
        applySwitchInAbilities(pokemon, switchOpponent, this.weather, this.logger, this.generation);

        this.logger.addItem([
          '[ApplyActions]',
          player.getName(),
          'switched to',
          pokemon.getName()
        ].join(' '));
      }

      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }

    // if enemy tries to switch pokemon
      // check to see if player has an ability to stop (e.g. Shadow Tag)
      // if so, enemy chooses a new action
      // this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
      // if not, switch pokemon

    // if player tries to run
    if (action.type === ActionTypes.RUN) {
      let { player, target } = action;

      this.escapeAttempts += 1;
      let canEscape = calcEscape(
        player.team.getActivePokemon(),
        target.team.getActivePokemon(),
        this.escapeAttempts
      );

      if (canEscape) {
        this.logger.addItem('[ApplyActions] You successfully ran away!');
        this.stateMachine.setState(this.stateDef.BATTLE_END);
      } else {
        this.logger.addItem('[ApplyActions] You can\'t escape!');
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      }
      return;
    }

    // if either players selected an attack
      // is the user locked into a multi-turn move?
      // check for pokemon obedience
      // check for status effects, e.g. paralysis, sleep, flinch, confusion, etc
      // check for priority moves
      // check for whos faster via pokemon speed stat

    if ([ActionTypes.ATTACK, ActionTypes.NPC_ATTACK].includes(action.type)) {
      let { config, target, player, type } = action;
      let info = {};
      let activeMon = player.team.getActivePokemon();

      // Determine which side is attacking so we can look up the correct screen state.
      const attackerKey = player.getName().toLowerCase() === 'player' ? 'player' : 'enemy';
      const defenderKey = attackerKey === 'player' ? 'enemy' : 'player';
      const fieldState = this.screens[defenderKey];
      const weather    = this.weather ?? null;

      // Pursuit: set pursuiting flag on fieldState when opponent is switching this turn.
      if (config?.move?.name?.toLowerCase() === 'pursuit') {
        fieldState.pursuiting = this.actions[defenderKey]?.type === ActionTypes.SWITCH_POKEMON;
      } else {
        fieldState.pursuiting = false;
      }

      // ── Pre-attack status checks ────────────────────────────────────────────

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
        activeMon.volatileStatus.confusedTurns--;
        if (activeMon.volatileStatus.confusedTurns === 0) {
          this.logger.addItem(`${activeMon.getName()} snapped out of confusion!`);
        } else {
          this.logger.addItem(`${activeMon.getName()} is confused!`);
          if (Math.random() < 0.5) {
            const selfInfo = CalcDamage.calculate(activeMon, activeMon, CONFUSION_HIT, { stab: 1, typeEffectiveness: 1 }, this.generation);
            const selfDmg = Math.max(1, selfInfo.damage || 0);
            activeMon.takeDamage(selfDmg);
            this.logger.addItem(`It hurt itself in its confusion! (${selfDmg} damage)`);
            this.currentAction = null;
            this.remapActivePokemon();
            this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
            return;
          }
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
      // Log the attacker's name so the player can distinguish this from their own move failing.
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

      // Bide — charge or release turn (handled before the switch so the return paths work cleanly).
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
        this.remapActivePokemon();
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }

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
            console.warn('[ApplyActions] No move found in action config, returning to BATTLE_IDLE state');
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
              this.remapActivePokemon();
              this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
              return;
            }
          }

          // Check if this is the charge turn of a two-turn move.
          // Solar Beam skips its charge turn in harsh sunlight.
          const multiTurnDef = move.multiTurn ?? null;
          // Solar Beam skips its charge turn in sun — Gen 3+ behaviour only.
          const solarBeamInSun = this.generation.gen >= 3 &&
            move.name?.toLowerCase() === 'solar beam' && weather?.type === 'sun';
          if (multiTurnDef && !activeMon.lockedMove && !solarBeamInSun) {
            // Charge turn: decrement PP, show the wind-up message, lock in.
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
            this.remapActivePokemon();
            this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
            return;
          }

          // Ability-based type immunity (Levitate, Flash Fire, Volt Absorb, Water Absorb, Dry Skin).
          // Only applies to damaging moves (power > 0).
          if ((move.power ?? 0) > 0) {
            const immunityMsg = checkAbilityImmunity(target, move, weather);
            if (immunityMsg) {
              // Log "X used Y" before the immunity message.
              this.logger.addItem(`${activeMon.getName()} uses ${move.name} against ${target.getName()}`);
              this.logger.addItem(immunityMsg);
              // Deduct PP normally.
              if (move.pp) move.pp.current = Math.max(0, move.pp.current - 1);
              activeMon.isFirstTurn = false;
              activeMon.lastUsedMove = move;
              this.currentAction = null;
              this.remapActivePokemon();
              this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
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
            // Multi-hit move — roll hit count and deal damage per-hit.
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

      this.logger.addItem([
        activeMon.getName(),
        'uses',
        info.move,
        'against',
        info.enemy
      ].join(' '));

      if (info.reflected) {
        this.logger.addItem(`${info.enemy} bounced the move back with Magic Coat!`);
      }

      if (info.accuracy === 0) {
        if (info.disabled) {
          this.logger.addItem(`${activeMon.getName()}'s ${info.move} is disabled!`);
        } else if (info.failed) {
          this.logger.addItem('But it failed!');
        } else {
          this.logger.addItem('It totally missed!');
        }
        // Crash attack (High Jump Kick / Jump Kick): missed, user takes 1 HP damage.
        if (info.crashDamage > 0) {
          this.logger.addItem(`${activeMon.getName()} kept going and crashed!`);
          this.remapActivePokemon();
        }
        this.currentAction = null;
        this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
        return;
      }

      if (info.magnitudeLevel !== undefined) {
        this.logger.addItem(`Magnitude ${info.magnitudeLevel}!`);
      }

      if (Array.isArray(info.hitResults) && info.hitResults.length > 0) {
        info.hitResults.forEach(({ damage, critical }, i) => {
          if (damage > 0) {
            this.logger.addItem(`   Hit ${i + 1}: ${damage} damage!`);
          }
          if (critical > 1) {
            this.logger.addItem('A critical hit!');
          }
        });
        this.logger.addItem(`Hit ${info.hits} time${info.hits === 1 ? '' : 's'}!`);
      } else {
        if (info.damage > 0) {
          this.logger.addItem([
            '   for',
            info.damage,
            '('+ action.target.currentHp+')',
            'damage!'
          ].join(' '));
        }

        if (info.critical > 1) {
          this.logger.addItem('It was a critical hit!');
        }
      }

      console.log('[ApplyActions] info', info);
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
        this.logger.addItem("Reflect weakened the damage!");
      } else if (info.screenReduced === 'lightScreen') {
        this.logger.addItem("Light Screen weakened the damage!");
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
        this.remapActivePokemon();
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
        const side = this.screens[attackerKey];
        side.lightScreen = 5;
        this.logger.addItem(`${activeMon.getName()} put up a Light Screen!`);
      }
      if (info.effect?.reflect) {
        const side = this.screens[attackerKey];
        side.reflect = 5;
        this.logger.addItem(`${activeMon.getName()} put up a Reflect!`);
      }

      // Weather — set a 5-turn weather condition on the field.
      // Weather was introduced in Gen 2; Hail was introduced in Gen 3.
      if (info.effect?.setWeather) {
        const wType = info.effect.setWeather;
        const gen = this.generation.gen ?? 3;
        const weatherAllowed = gen >= 2 && (wType !== 'hail' || gen >= 3);
        if (weatherAllowed) {
          const WEATHER_START = {
            rain:       'A heavy rain began to fall!',
            sun:        'The sunlight turned harsh!',
            sandstorm:  'A sandstorm brewed!',
            hail:       'It started to hail!',
          };
          this.weather.type     = wType;
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
      if (activeMon.volatileStatus?.charged && info.move) {
        const usedMove = config?.move;
        if (usedMove?.type === TYPES.ELECTRIC) {
          activeMon.volatileStatus.charged = false;
        }
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
        this.remapActivePokemon();
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
        const allTypes = Object.values(TYPES).filter(t => typeof t === 'string');
        const resisting = allTypes.filter(t => {
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

      // Uproar — lock the user into Uproar for additional turns.
      if (info.effect?.startUproar) {
        activeMon.volatileStatus.uproaring = { move: config.move, turnsLeft: info.effect.startUproar };
      }

      // Force switch (Roar / Whirlwind) — blow the target away; replace with a random party member.
      if (info.effect?.forceSwitch) {
        const bench = (target.team?.pokemon ?? []).filter(p => p !== target && p.isAlive && p.isAlive());
        if (bench.length > 0) {
          const replacement = bench[Math.floor(Math.random() * bench.length)];
          target.team.setActivePokemon(replacement);
          replacement.isFirstTurn = true;
          this.logger.addItem(`${target.getName()} was blown away! Go, ${replacement.getName()}!`);
          this.actions[defenderKey].target = replacement;
          this.remapActivePokemon();
        } else {
          this.logger.addItem(`${target.getName()} has nowhere to go!`);
        }
      }

      this.currentAction = null;

      this.remapActivePokemon();
      this.logger.flush(() => this.stateMachine.setState(this.stateDef.BEFORE_ACTION));
      return;
    }



    // apply any damage calculations

    // apply any weather effects, e.g. hail, sandstorm, etc
    // apply for poison, burn, etc
    // apply move effects e.g future sight, destiny bond, leech seed, etc
    // apply abilities e.g moody, speed boost, etc

    // check if any active pokemon are fainted
    // if player mon is fainted
      // check to see if player has living pokemon
      // this.stateMachine.setState(this.stateDef.PLAYER_POKEMON);
      // if not, go to BATTLE_LOST state
      // this.stateMachine.setState(this.stateDef.BATTLE_LOST);
    // if enemy mon is fainted
      // check to see if enemy has living pokemon
      // if so, go back to BEFORE_ACTION state
      // this.stateMachine.setState(this.stateDef.BEFORE_ACTION);
      // if not, go to BATTLE_WIN state
      // this.stateMachine.setState(this.stateDef.BATTLE_WIN);

  }
}