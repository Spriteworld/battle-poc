/**
 * @spriteworld/battle
 * Library entry point — exports all public battle engine classes and scenes.
 * Import these into the host Phaser game to add battle functionality.
 */

// Battle logic
export {
  Game,
  WildTrainer,
  BattleTrainer,
  BattleTeam,
  BattlePokemon,
  Action,
  ActionTypes,
} from '@Objects';

// UI components
export {
  Menu,
  MenuItem,
  PauseMenu,
  BattleMenu,
  PokemonTeamMenu,
  PokemonSwitchMenu,
  ActivePokemonMenu,
  AttackMenu,
  BagMenu,
  HpBar,
  PokemonStatusBox,
  DialogBox,
} from '@Objects';

// Battle item classes — use to build inventory configs
export { Items } from '@spriteworld/pokemon-data';

// Phaser scenes — add these to your game's scene list
export { default as Preload } from '@Scenes/misc/Preload.js';
export { default as BattleScene } from '@Scenes/misc/battle/Scene2.js';
export { default as BattleUI } from '@Scenes/misc/battle/UI.js';
