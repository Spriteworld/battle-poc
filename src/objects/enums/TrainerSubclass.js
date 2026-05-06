/**
 * Trainer subclass — the cosmetic title shown before a trainer's name in battle
 * (e.g. "GYM LEADER Misty", "RIVAL Gary").
 *
 * Subclass is independent of TrainerClass: it does not affect AI behaviour or
 * random-deviation percentages.  Use it purely for display and flavour.
 *
 * @enum {string}
 */

// ─── Named-role subclasses ────────────────────────────────────────────────────

/** The player's recurring rival. */
export const RIVAL = 'Rival';

/** A regional champion or hall-of-fame defender. */
export const CHAMPION = 'Champion';

/** A member of the Elite Four. */
export const ELITE_FOUR = 'Elite Four';

/** A Gym Leader. */
export const GYM_LEADER = 'Gym Leader';

// ─── Common trainer subclasses ─────────────────────────────────────────────────

export const ACE_TRAINER = 'Ace Trainer';
export const ARTIST = 'Artist';
export const BATTLE_GIRL = 'Battle Girl';
export const BEAUTY = 'Beauty';
export const BIKER = 'Biker';
export const BIRD_KEEPER = 'Bird Keeper';
export const BLACK_BELT = 'Black Belt';
export const BOARDER = 'Boarder';
export const BUG_CATCHER = 'Bug Catcher';
export const BUG_MANIAC = 'Bug Maniac';
export const CAMPER = 'Camper';
export const COLLECTOR = 'Collector';
export const COOLTRAINER = 'Cool Trainer';
export const DRAGON_TAMER = 'Dragon Tamer';
export const EXPERT = 'Expert';
export const FIREBREATHER = 'Firebreather';
export const FISHERMAN = 'Fisherman';
export const GENTLEMAN = 'Gentleman';
export const GUITARIST = 'Guitarist';
export const HIKER = 'Hiker';
export const JUGGLER = 'Juggler';
export const KINDLER = 'Kindler';
export const LASS = 'Lass';
export const LEADER = 'Leader';
export const MANIAC = 'Maniac';
export const MEDIUM = 'Medium';
export const NINJA_BOY = 'Ninja Boy';
export const PICNICKER = 'Picnicker';
export const POKEMANIAC = 'Pokémaniac';
export const POKEMON_BREEDER = 'Pokémon Breeder';
export const POKEMON_RANGER = 'Pokémon Ranger';
export const POKEMON_TRAINER = 'Pokémon Trainer';
export const PSYCHIC = 'Psychic';
export const RUIN_MANIAC = 'Ruin Maniac';
export const SAILOR = 'Sailor';
export const SCHOOLBOY = 'Schoolboy';
export const SCHOOLKID = 'Schoolkid';
export const SCIENTIST = 'Scientist';
export const SUPER_NERD = 'Super Nerd';
export const SWIMMER_M = 'Swimmer♂';
export const SWIMMER_F = 'Swimmer♀';
export const TEAM_AQUA_GRUNT = 'Team Aqua Grunt';
export const TEAM_MAGMA_GRUNT = 'Team Magma Grunt';
export const TEAM_ROCKET_GRUNT = 'Team Rocket Grunt';
export const TRIATHLETE = 'Triathlete';
export const TUBER_M = 'Tuber♂';
export const TUBER_F = 'Tuber♀';
export const TWINS = 'Twins';
export const WINSTRATE = 'Winstrate';
export const YOUNG_COUPLE = 'Young Couple';
export const YOUNGSTER = 'Youngster';

/** No subclass / generic trainer with no title. */
export const NONE = null;
