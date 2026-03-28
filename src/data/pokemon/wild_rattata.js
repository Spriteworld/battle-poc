import { BasePokemon } from "@spriteworld/pokemon-data";
import { GAMES, NATURES, STATS } from "@spriteworld/pokemon-data";

export default new BasePokemon({
  game: GAMES.POKEMON_FIRE_RED,
  pid: 1,
  originalTrainer: 'Wild',
  nickname: 'Rattata',
  species: 19,
  level: 5,
  nature: NATURES.HARDY,
  ability: 'Run Away',
  moves: [{
    name: 'Tackle',
    pp: {
      max: 10,
      current: 10
    },
  }, {
    name: 'Double Kick',
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
});
