import { BasePokemon } from "@spriteworld/pokemon-data";
import { GAMES, NATURES, STATS } from "@spriteworld/pokemon-data";

export default new BasePokemon({
  game: GAMES.POKEMON_FIRE_RED,
  pid: 1,
  originalTrainer: 'Wild',
  nickname: 'GYARADOS',
  species: 'gyarados',
  gender: 'male',
  level: 100,
  nature: NATURES.JOLLY,
  ability: 'moxie',
  item: null,
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
    [STATS.ATTACK]: 252,
    [STATS.DEFENSE]: 0,
    [STATS.SPECIAL_ATTACK]: 0,
    [STATS.SPECIAL_DEFENSE]: 4,
    [STATS.SPEED]: 252,
  },
  moves: [
    { name: 'Waterfall', pp: { current: 10, max: 10 } },
    { name: 'Dragon Dance', pp: { current: 10, max: 10 } },
    // { name: 'Earthquake', pp: { current: 10, max: 10 } },
    // { name: 'Power Whip', pp: { current: 10, max: 10 } },
  ],
  isShiny: false
});
