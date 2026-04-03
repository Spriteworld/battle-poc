import { BasePokemon } from '@spriteworld/pokemon-data';
import { GAMES, NATURES, STATS } from '@spriteworld/pokemon-data';

export default {
  game: GAMES.POKEMON_FIRE_RED,
  pid: 1,
  originalTrainer: 'Player',
  nickname: 'Squirtle',
  species: 7,
  level: 5,
  nature: NATURES.HARDY,
  ability: 'Torrent',
  moves: [{
    name: 'Tackle',
    pp: {
      max: 35,
      current: 35
    },
  }, {
    name: 'Tail Whip',
    pp: {
      max: 30,
      current: 30
    },
  }, {
    name: 'Reflect',
    pp: {
      max: 20,
      current: 20
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
