import { Abilities, Moves, TYPES, calcTypeEffectiveness } from '@spriteworld/pokemon-data';

// Power of a hypothetical STAB attack used to weight defensive matchup.
// Picked at the mid-range of common STAB moves so the offence/defence
// halves of the score compare on the same scale.
const ASSUMED_STAB_POWER = 80;

function hasAbility(mon, ability) {
  return typeof mon?.hasAbility === 'function' && mon.hasAbility(ability);
}

function filterToChartTypes(types, chartKeys) {
  if (!chartKeys.length) return types ?? [];
  return (types ?? []).filter(t => chartKeys.includes(t));
}

function bestOffence(self, opponent, generation) {
  const typeChart = generation?.typeChart;
  const chartKeys = Object.keys(typeChart?.TYPES ?? {});
  const defTypes  = filterToChartTypes(opponent?.types, chartKeys);

  let best = 0;
  for (const move of self?.moves ?? []) {
    if ((move?.pp?.current ?? 0) <= 0) continue;
    const category = generation?.getCategory?.(move) ?? move?.category;
    if (category === Moves.MOVE_CATEGORIES.STATUS) continue;
    const eff = (chartKeys.length && chartKeys.includes(move.type) && defTypes.length)
      ? calcTypeEffectiveness(move.type, defTypes, typeChart)
      : 1;
    const score = (move.power || 0) * eff;
    if (score > best) best = score;
  }
  return best;
}

function worstDefence(self, opponent, generation) {
  const typeChart  = generation?.typeChart;
  const chartKeys  = Object.keys(typeChart?.TYPES ?? {});
  const selfDef    = filterToChartTypes(self?.types, chartKeys);
  if (!selfDef.length) return 0;

  let worst = 0;
  for (const t of opponent?.types ?? []) {
    if (chartKeys.length && !chartKeys.includes(t)) continue;
    const eff = calcTypeEffectiveness(t, selfDef, typeChart);
    if (eff > worst) worst = eff;
  }
  return worst;
}

function matchupScore(self, opponent, generation) {
  return bestOffence(self, opponent, generation) - worstDefence(self, opponent, generation) * ASSUMED_STAB_POWER;
}

function isTrapped(self, opponent) {
  const vs = self?.volatileStatus;
  if (vs?.trapped) return true;
  if (vs?.ingrained) return true;

  const selfTypes = self?.types ?? [];
  if (hasAbility(opponent, Abilities.ARENA_TRAP)) {
    const flying   = selfTypes.includes(TYPES.FLYING);
    const levitate = hasAbility(self, Abilities.LEVITATE);
    if (!flying && !levitate) return true;
  }
  if (hasAbility(opponent, Abilities.SHADOW_TAG) && !hasAbility(self, Abilities.SHADOW_TAG)) {
    return true;
  }
  if (hasAbility(opponent, Abilities.MAGNET_PULL) && selfTypes.includes(TYPES.STEEL)) {
    return true;
  }
  return false;
}

/**
 * Decide whether the active Pokémon should be switched out for a better
 * matchup.
 *
 * Scoring compares the active Pokémon and each healthy teammate on two axes:
 * best damaging move against the opponent, minus the opponent's best STAB
 * effectiveness back. Aggression controls how large the advantage must be
 * before the AI commits a turn to switching — lower-tier trainers need a
 * clearly lopsided matchup, champion-tier trainers switch on smaller edges.
 *
 * @param {object}   active      The active BattlePokemon.
 * @param {object}   opponent    The opposing active BattlePokemon.
 * @param {object[]} benched     Teammates on the same side (may include the
 *                               active and fainted Pokémon; both are filtered).
 * @param {object}   generation  Generation config (supplies typeChart and
 *                               getCategory).
 * @param {number}   aggression  0..1 — higher = switches on smaller edges.
 * @returns {object|null} The Pokémon to switch to, or null to stay in.
 */
export function shouldSwitch(active, opponent, benched, generation, aggression) {
  if (!active || !opponent || !generation) return null;
  if (isTrapped(active, opponent)) return null;

  const alive = (benched ?? []).filter(p => p && p !== active && (p.currentHp ?? 0) > 0);
  if (!alive.length) return null;

  const currentScore = matchupScore(active, opponent, generation);

  let best = null;
  for (const mon of alive) {
    const score = matchupScore(mon, opponent, generation);
    if (!best || score > best.score) best = { mon, score };
  }
  if (!best) return null;

  // Never switch into a losing matchup just because it is marginally less bad.
  if (best.score <= 0) return null;

  const gap = best.score - currentScore;
  // Aggression 0 → need a gap of 160 (two super-effective STAB worth of swing).
  // Aggression 1 → gap of 40 is enough.
  const threshold = 160 - 120 * Math.max(0, Math.min(1, aggression));
  if (gap < threshold) return null;

  return best.mon;
}

export const __testing = { bestOffence, worstDefence, matchupScore, isTrapped };
