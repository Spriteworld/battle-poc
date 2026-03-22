import { ActionTypes } from '@Objects';
import { Abilities, calcEscape, Moves, STATUS } from '@spriteworld/pokemon-data';

const { MULTI_TURN_MOVES, MULTI_HIT_MOVES, rollHitCount } = Moves;

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

      this.time.addEvent({ 
        delay: 1000, 
        callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION), 
        callbackScope: this 
      });
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

        // switch pokemon
        player.team.setActivePokemon(pokemon);

        let enemy = player.getName().toLowerCase() === 'player' ? 'enemy' : 'player';
        console.log('[ApplyActions] Setting action target for', enemy, 'to', pokemon.getName());
        this.actions[enemy].target = pokemon;

        this.remapActivePokemon();
        this.logger.addItem([
          '[ApplyActions]',
          player.getName(),
          'switched to',
          pokemon.getName()
        ].join(' '));
      }

      this.time.addEvent({ 
        delay: 1000, 
        callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION), 
        callbackScope: this 
      });
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
        this.time.addEvent({ 
          delay: 1000, 
          callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION), 
          callbackScope: this 
        });
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

      // ── Pre-attack status checks ────────────────────────────────────────────

      // Paralysis: 25% chance to be unable to move this turn.
      if (activeMon.status?.[STATUS.PARALYZE] > 0 && Math.random() < 0.25) {
        this.logger.addItem(`${activeMon.getName()} is paralyzed! It can't move!`);
        this.currentAction = null;
        this.time.addEvent({
          delay: 1000,
          callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
          callbackScope: this,
        });
        return;
      }

      // Sleep: can't move while asleep; decrement counter and check for wake-up.
      if (activeMon.status?.[STATUS.SLEEP] > 0) {
        activeMon.status[STATUS.SLEEP]--;
        if (activeMon.status[STATUS.SLEEP] === 0) {
          this.logger.addItem(`${activeMon.getName()} woke up!`);
          // Falls through — Pokémon acts normally on the wake-up turn.
        } else {
          this.logger.addItem(`${activeMon.getName()} is fast asleep!`);
          this.currentAction = null;
          this.time.addEvent({
            delay: 1000,
            callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
            callbackScope: this,
          });
          return;
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
          this.time.addEvent({
            delay: 1000,
            callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
            callbackScope: this,
          });
          return;
        }
      }

      // Flinch: set by a faster move that hit this Pokémon earlier this round.
      if (activeMon.flinched) {
        activeMon.flinched = false;
        this.logger.addItem(`${activeMon.getName()} flinched and couldn't move!`);
        this.currentAction = null;
        this.time.addEvent({
          delay: 1000,
          callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
          callbackScope: this,
        });
        return;
      }

      // If the target is invulnerable on their charge turn, the attack fails.
      // Log the attacker's name so the player can distinguish this from their own move failing.
      if (target.invulnerable) {
        const moveLabel = (type === ActionTypes.ATTACK && config?.move)
          ? ` used ${config.move.name} but`
          : ' attacked, but';
        this.logger.addItem(`${activeMon.getName()}${moveLabel} it failed!`);
        this.currentAction = null;
        this.time.addEvent({
          delay: 1000,
          callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
          callbackScope: this,
        });
        return;
      }

      switch (type) {
        case ActionTypes.ATTACK: {
          let move = config.move;
          if (!move || typeof move !== 'object') {
            console.warn('[ApplyActions] No move found in action config, returning to BATTLE_IDLE state');
            this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
            return;
          }

          // Check if this is the charge turn of a two-turn move.
          const multiTurnDef = MULTI_TURN_MOVES[move.name?.toLowerCase()];
          if (multiTurnDef && !activeMon.lockedMove) {
            // Charge turn: decrement PP, show the wind-up message, lock in.
            move.pp.current = Math.max(0, move.pp.current - 1);
            this.logger.addItem(multiTurnDef.chargeMessage.replace('{name}', activeMon.getName()));
            activeMon.lockedMove = { move, invulnerable: multiTurnDef.invulnerable };
            activeMon.invulnerable = multiTurnDef.invulnerable;
            this.currentAction = null;
            this.remapActivePokemon();
            this.time.addEvent({
              delay: 1000,
              callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
              callbackScope: this,
            });
            return;
          }

          // Strike turn (or a regular move): clear locked state then attack.
          if (activeMon.lockedMove) {
            activeMon.lockedMove = null;
            activeMon.invulnerable = false;
            info = activeMon.attackLocked(target, move, this.generation);
          } else {
            // Multi-hit move — roll hit count and deal damage per-hit.
            const multiHitDef = MULTI_HIT_MOVES[move.name?.toLowerCase()];
            if (multiHitDef) {
              const hitCount = rollHitCount(multiHitDef.minHits, multiHitDef.maxHits);
              info = activeMon.attackMultiHit(target, move, this.generation, hitCount);
            } else {
              info = activeMon.attack(target, move, this.generation);
            }
          }
          break;
        }
        case ActionTypes.NPC_ATTACK:
          info = activeMon.attackWithAI(target, this.generation);
        break;
      }

      this.logger.addItem([
        activeMon.getName(),
        'uses',
        info.move,
        'against',
        info.enemy
      ].join(' '));

      if (info.accuracy === 0) {
        this.logger.addItem('It totally missed!');
        this.currentAction = null;
        this.time.addEvent({
          delay: 1000,
          callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
          callbackScope: this,
        });
        return;
      }

      if (info.damage > 0) {
        this.logger.addItem([
          '   for',
          info.damage,
          '('+ action.target.currentHp+')',
          'damage!'
        ].join(' '));
      }

      if (info.hits > 1) {
        this.logger.addItem(`Hit ${info.hits} time${info.hits === 1 ? '' : 's'}!`);
      }

      if (info.critical > 1) {
        this.logger.addItem('It was a critical hit!');
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

      if (info.effect?.message) {
        this.logger.addItem(info.effect.message);
      }

      if (info.damage === 0 && !info.effect && info.typeEffectiveness !== 0) {
        this.logger.addItem('It had no effect!');
      }

      this.currentAction = null;

      this.remapActivePokemon();
      this.time.addEvent({
        delay: 1000,
        callback: () => this.stateMachine.setState(this.stateDef.BEFORE_ACTION),
        callbackScope: this
      });
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