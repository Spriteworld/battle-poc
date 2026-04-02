/**
 * Trainer class types that determine AI behaviour and battle style.
 *
 * Role-based classes (use these for named characters):
 * @enum {string}
 */
export const WILD        = 'wild';
export const TRAINER     = 'trainer';
export const GYM_LEADER  = 'gym_leader';
export const ELITE_FOUR  = 'elite_four';

/**
 * Generation-based classes (use these when targeting a specific game era's AI).
 * Each maps to a documented random-deviation percentage and any generation-
 * specific quirks (e.g. the Gen 1 type-check bug).
 */
export const GEN_1 = 'gen_1'; // 50 % random, uses attacker type for effectiveness (Gen 1 bug)
export const GEN_2 = 'gen_2'; // 40 % random, type-correct scoring
export const GEN_3 = 'gen_3'; // 30 % random  (same as TRAINER)
export const GEN_4 = 'gen_4'; // 20 % random
export const GEN_5 = 'gen_5'; // 10 % random
export const GEN_6 = 'gen_6'; //  5 % random
export const GEN_7 = 'gen_7'; //  2 % random
export const GEN_8 = 'gen_8'; //  0 % random (same as ELITE_FOUR)

/**
 * Cross-generational champion class — draws from the full national dex and all
 * available moves.  Plays with perfect optimisation (0 % random deviation).
 */
export const CHAMPIONS = 'champions';
