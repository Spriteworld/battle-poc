import { STATUS } from '@spriteworld/pokemon-data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the Pokémon already has any primary status condition. */
function hasStatus(pokemon) {
  return Object.values(pokemon.status).some(v => v > 0);
}

/**
 * Applies a primary status condition.
 * Sets modifiers.burn for CalcDamage compatibility.
 * @return {boolean} false if the pokemon already had a status (application failed).
 */
function applyStatus(pokemon, condition) {
  if (hasStatus(pokemon)) return false;
  pokemon.status[condition] = 1;
  if (condition === STATUS.BURN) pokemon.modifiers.burn = true;
  return true;
}

const STATUS_MESSAGES = {
  [STATUS.BURN]:     name => `${name} was burned!`,
  [STATUS.PARALYZE]: name => `${name} was paralyzed! It may be unable to move!`,
  [STATUS.POISON]:   name => `${name} was poisoned!`,
  [STATUS.TOXIC]:    name => `${name} was badly poisoned!`,
  [STATUS.FROZEN]:   name => `${name} was frozen solid!`,
  [STATUS.SLEEP]:    name => `${name} fell asleep!`,
};

// ─── Effect factories ──────────────────────────────────────────────────────────

/**
 * Creates an effect for STATUS moves — always applies the condition when the move hits.
 * @param {string} condition - STATUS constant
 * @return {function}
 */
function primaryStatus(condition) {
  return function onEffect(attacker, defender, info) {
    if (!applyStatus(defender, condition)) return null;
    return { message: STATUS_MESSAGES[condition](defender.getName()) };
  };
}

/**
 * Creates a secondary effect — applies condition at given % chance only when the move
 * deals damage (not a STATUS move or a type-immune hit).
 * @param {string} condition - STATUS constant
 * @param {number} chance - percentage (0–100)
 * @return {function}
 */
function secondaryStatus(condition, chance) {
  return function onEffect(attacker, defender, info) {
    if (info.damage === 0) return null;
    if (Math.random() * 100 >= chance) return null;
    if (!applyStatus(defender, condition)) return null;
    return { message: STATUS_MESSAGES[condition](defender.getName()) };
  };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Maps lowercase move name → onEffect(attacker, defender, info) function.
 *
 * onEffect is called after the move's damage is applied. It should:
 *   - Modify pokemon state directly (e.g. defender.status, defender.modifiers)
 *   - Return { message: string } on success, or null if the effect did not apply.
 *
 * @type {Object.<string, function>}
 */
export const MOVE_EFFECTS = {
  // ── Status moves (primary effects) ─────────────────────────────────────────
  'thunder wave':  primaryStatus(STATUS.PARALYZE),
  'stun spore':    primaryStatus(STATUS.PARALYZE),
  'toxic':         primaryStatus(STATUS.TOXIC),
  'will-o-wisp':   primaryStatus(STATUS.BURN),
  'poison powder': primaryStatus(STATUS.POISON),
  'poison gas':    primaryStatus(STATUS.POISON),
  'sleep powder':  primaryStatus(STATUS.SLEEP),
  'hypnosis':      primaryStatus(STATUS.SLEEP),
  'sing':          primaryStatus(STATUS.SLEEP),
  'lovely kiss':   primaryStatus(STATUS.SLEEP),
  'spore':         primaryStatus(STATUS.SLEEP),

  // ── Fire — 10% burn ────────────────────────────────────────────────────────
  'ember':         secondaryStatus(STATUS.BURN, 10),
  'flamethrower':  secondaryStatus(STATUS.BURN, 10),
  'fire blast':    secondaryStatus(STATUS.BURN, 10),
  'fire punch':    secondaryStatus(STATUS.BURN, 10),
  'flame wheel':   secondaryStatus(STATUS.BURN, 10),
  'heat wave':     secondaryStatus(STATUS.BURN, 10),
  'blaze kick':    secondaryStatus(STATUS.BURN, 10),
  'sacred fire':   secondaryStatus(STATUS.BURN, 50),

  // ── Electric — paralysis ───────────────────────────────────────────────────
  'thunderbolt':   secondaryStatus(STATUS.PARALYZE, 10),
  'thunder':       secondaryStatus(STATUS.PARALYZE, 30),
  'thunder punch': secondaryStatus(STATUS.PARALYZE, 10),
  'spark':         secondaryStatus(STATUS.PARALYZE, 30),
  'lick':          secondaryStatus(STATUS.PARALYZE, 30),
  'body slam':     secondaryStatus(STATUS.PARALYZE, 30),
  'tri attack':    secondaryStatus(STATUS.PARALYZE, 6), // 1/3 × 1/6 × 3 categories

  // ── Ice — 10% freeze ───────────────────────────────────────────────────────
  'ice beam':      secondaryStatus(STATUS.FROZEN, 10),
  'blizzard':      secondaryStatus(STATUS.FROZEN, 10),
  'ice punch':     secondaryStatus(STATUS.FROZEN, 10),
  'powder snow':   secondaryStatus(STATUS.FROZEN, 10),
  'aurora beam':   secondaryStatus(STATUS.FROZEN, 10),

  // ── Poison ─────────────────────────────────────────────────────────────────
  'poison sting':  secondaryStatus(STATUS.POISON, 30),
  'sludge':        secondaryStatus(STATUS.POISON, 30),
  'sludge bomb':   secondaryStatus(STATUS.POISON, 30),
  'smog':          secondaryStatus(STATUS.POISON, 40),
};
