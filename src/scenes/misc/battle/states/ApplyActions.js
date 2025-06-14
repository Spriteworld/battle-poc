import { ActionTypes } from '@Objects';

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
      // check to see if enemy or field has an ability to stop (e.g. Arena Trap)
      // if so, show message and go back to PLAYER_ACTION state
      // this.stateMachine.setState(this.stateDef.PLAYER_ACTION);
      // if not, switch pokemon

    // if enemy tries to switch pokemon
      // check to see if player has an ability to stop (e.g. Shadow Tag)
      // if so, enemy chooses a new action
      // this.stateMachine.setState(this.stateDef.ENEMY_ACTION);
      // if not, switch pokemon

    // if player tries to run
      // check to see if wild battle
        // if so, check speed of enemy pokemon
        // if not, show message and go back to PLAYER_ACTION state
        // this.stateMachine.setState(this.stateDef.PLAYER_ACTION);

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
      let move = config.move;
      if (Object.keys(config).includes('move') === false || typeof move !== 'object') {
        console.warn('[ApplyActions] No move found in action config, returning to BATTLE_IDLE state');
        this.stateMachine.setState(this.stateDef.BATTLE_IDLE);
        return;
      }
      
      switch (type) {
        case ActionTypes.ATTACK:
          info = activeMon.attack(target, config.move);
        break;
        case ActionTypes.NPC_ATTACK:
          info = activeMon.attackRandomMove(target);
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
        return;
      }

      if (info.damage === 0) {
        this.logger.addItem('It has no effect!');
        return;
      } else {
        this.logger.addItem([
          '   for',
          info.damage,
          '('+ action.target.currentHp+')',
          'damage!'
        ].join(' '));          
      }

      if (info.critical === 2) {
        this.logger.addItem('It was a critical hit!');
      }

      switch (info.typeEffectiveness) {
        case 2:
        case 4:
          this.logger.addItem('It was super effective!');
        break;
        case 0.25:
          this.logger.addItem('It wasnt very effective!');
        break;
        case 0:
          this.logger.addItem('It has no effect!');
        break;
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