import { BasePokemon } from '@spriteworld/pokemon-data';
import { GAMES, NATURES, STATS } from '@spriteworld/pokemon-data';

export default new BasePokemon({
  game: GAMES.POKEMON_FIRE_RED,
  pid: 1,
  originalTrainer: 'Wild',
  nickname: 'PIKACHU',
  species: 'pikachu',
  gender: 'male',
  level: 100,
  nature: NATURES.NAUGHTY,
  ability: 'Static',
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
    [STATS.SPECIAL_ATTACK]: 4,
    [STATS.SPECIAL_DEFENSE]: 0,
    [STATS.SPEED]: 252,
  },
  moves: [
    { name: 'Thunderbolt', pp: { current: 10, max: 10 } },
    { name: 'Extreme Speed', pp: { current: 10, max: 10 } },
    { name: 'Volt Tackle', pp: { current: 10, max: 10 } },
    { name: 'Swift', pp: { current: 10, max: 10 } },
  ],
  isShiny: false
});
