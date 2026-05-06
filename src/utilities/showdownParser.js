/**
 * Re-exports the Showdown team-export parser from the shared data package.
 *
 * The canonical implementation lives in @spriteworld/pokemon-data (data/src/utilities/showdown.js).
 * It uses the full national dex (Gen 1–9, 1025 species) for species lookup and
 * the Gen 8 move pool (663 moves) for move validation.
 */
export { parseTeam, parsePokemon } from '@spriteworld/pokemon-data';
