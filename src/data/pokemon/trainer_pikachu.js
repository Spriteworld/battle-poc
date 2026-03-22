import { BasePokemon, GENDERS } from "@spriteworld/pokemon-data";
import { GAMES, NATURES, STATS } from "@spriteworld/pokemon-data";

export default {
  game: GAMES.POKEMON_FIRE_RED,
  pid: 1,
  originalTrainer: 'Trainer',
  nickname: 'Sparky',
  species: 25,
  level: 5,
  gender: GENDERS.FEMALE,
  nature: NATURES.HARDY,
  ability: {
    name: 'none',
  },
  moves: [{
    name: 'Tackle',
    pp: {
      max: 10,
      current: 10
    },
  }, {
    name: 'ThunderBolt',
    pp: {
      max: 10,
      current: 10
    },
  }],
  ivs: {
    [STATS.HP]: 31,
    [STATS.ATTACK]: 31,
    [STATS.DEFENSE]: 31,
    [STATS.SPECIAL_ATTACK]: 31,
    [STATS.SPECIAL_DEFENSE]: 31,
    [STATS.SPEED]: 31,
  },
  evs: {
    [STATS.HP]: 0,
    [STATS.ATTACK]: 3,
    [STATS.DEFENSE]: 0,
    [STATS.SPECIAL_ATTACK]: 4,
    [STATS.SPECIAL_DEFENSE]: 0,
    [STATS.SPEED]: 0,
  },
  exp: 0,
  isShiny: false,
};
