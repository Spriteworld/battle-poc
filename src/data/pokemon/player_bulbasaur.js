import { BasePokemon, GENDERS } from "@spriteworld/pokemon-data";
import { GAMES, NATURES, STATS } from "@spriteworld/pokemon-data";

export default {
  game: GAMES.POKEMON_FIRE_RED,
  pid: 1,
  originalTrainer: 'Player',
  nickname: 'Bulbasaur',
  species: 1,
  level: 5,
  gender: GENDERS.MALE,
  nature: NATURES.HARDY,
  ability: {
    name: 'none',
  },
  currentHp: 15,
  moves: [{
    name: 'Tackle',
    pp: {
      max: 10,
      current: 10
    },
  }, {
    name: 'Bide',
    pp: {
      max: 5,
      current: 5
    },
  },{
    name: 'Leech Seed',
    pp: {
      max: 10,
      current: 10
    },
  },{
    name: 'Belly Drum',
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
    [STATS.HP]: 4,
    [STATS.ATTACK]: 0,
    [STATS.DEFENSE]: 4,
    [STATS.SPECIAL_ATTACK]: 5,
    [STATS.SPECIAL_DEFENSE]: 6,
    [STATS.SPEED]: 0,
  },
  exp: 0,
  isShiny: false,
};
