import { parseTeam, parsePokemon } from './showdownParser.js';

// ── Generation representative blocks ─────────────────────────────────────────
// One canonical-looking Showdown export per generation.
// Gen 1 Pokémon are in the FRLG pool; Gen 2+ are not and should return null.

/** Gen 1 — Charizard (#6). All moves are in the Sword pool. */
const GEN1_BLOCK = `\
Charizard @ Charcoal
Ability: Blaze
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Flamethrower
- Fire Blast
- Dragon Claw
- Earthquake`;

/** Gen 2 — Tyranitar (#248, not in FRLG). Moves are FRLG-valid but species will be skipped. */
const GEN2_BLOCK = `\
Tyranitar @ Leftovers
Ability: Sand Stream
Level: 50
EVs: 252 HP / 4 Atk / 252 SpD
Careful Nature
- Rock Slide
- Crunch
- Earthquake
- Thunder Wave`;

/** Gen 3 — Salamence (#373, not in FRLG). Moves are FRLG-valid but species will be skipped. */
const GEN3_BLOCK = `\
Salamence @ Choice Band
Ability: Intimidate
Level: 50
EVs: 4 HP / 252 Atk / 252 Spe
Adamant Nature
- Dragon Claw
- Earthquake
- Aerial Ace
- Fire Blast`;

/** Gen 4 — Garchomp (#445, not in FRLG). Stone Edge / Outrage are not in FRLG. */
const GEN4_BLOCK = `\
Garchomp @ Choice Scarf
Ability: Rough Skin
Level: 50
EVs: 4 HP / 252 Atk / 252 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Stone Edge
- Outrage`;

/** Gen 5 — Hydreigon (#635, not in FRLG). Dragon Pulse / Dark Pulse are not in FRLG. */
const GEN5_BLOCK = `\
Hydreigon @ Choice Specs
Ability: Levitate
Level: 50
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
- Dragon Pulse
- Dark Pulse
- Fire Blast
- Flash Cannon`;

/** Gen 6 — Aegislash (#681, in Sword). Shadow Sneak / King's Shield are Gen 6 moves. */
const GEN6_BLOCK = `\
Aegislash @ Weakness Policy
Ability: Stance Change
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
- Shadow Ball
- Flash Cannon
- Shadow Sneak
- King's Shield`;

/** Gen 7 — Mimikyu (#778, not in FRLG). Play Rough / Shadow Sneak are not in FRLG. */
const GEN7_BLOCK = `\
Mimikyu @ Mimikium Z
Ability: Disguise
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Shadow Claw
- Play Rough
- Shadow Sneak
- Swords Dance`;

/** Gen 8 — Corviknight (#823, not in FRLG). Iron Head / Brave Bird are not in FRLG. */
const GEN8_BLOCK = `\
Corviknight @ Leftovers
Ability: Pressure
Level: 50
EVs: 252 HP / 4 Def / 252 SpD
Careful Nature
- Iron Head
- Brave Bird
- Roost
- Bulk Up`;

// ── Fixtures (original) ───────────────────────────────────────────────────────

const CHARIZARD_BLOCK = `\
Charizard
Ability: Blaze
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Flamethrower
- Fire Blast
- Dragon Claw
- Earthquake`;

const NICKNAMED_BLOCK = `\
Zard (Charizard) @ Charcoal
Ability: Blaze
Level: 50
Timid Nature
- Flamethrower
- Dragon Claw`;

const GENGAR_BLOCK = `\
Gengar
Ability: Levitate
Level: 50
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
- Shadow Ball
- Thunderbolt
- Hypnosis
- Dream Eater`;

const UNKNOWN_MOVE_BLOCK = `\
Charizard
Ability: Blaze
Level: 50
Timid Nature
- Flamethrower
- NOTAREAL_MOVE_XYZ
- Dragon Claw
- Earthquake`;

const UNKNOWN_SPECIES_BLOCK = `\
Fakemon
Ability: Unknown
Level: 50
Timid Nature
- Tackle`;

const TWO_TEAM_TEXT = `${CHARIZARD_BLOCK}\n\n${GENGAR_BLOCK}`;

// ── parsePokemon ───────────────────────────────────────────────────────────────

describe('parsePokemon — species lookup', () => {
  test('resolves a known Gen 1 species to its nat_dex_id', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(6); // Charizard nat_dex_id
  });

  test('returns null for an unknown species', () => {
    expect(parsePokemon(UNKNOWN_SPECIES_BLOCK)).toBeNull();
  });

  test('parses nickname correctly', () => {
    const result = parsePokemon(NICKNAMED_BLOCK);
    expect(result).not.toBeNull();
    expect(result.nickname).toBe('Zard');
    expect(result.species).toBe(6);
  });
});

describe('parsePokemon — moves', () => {
  test('includes moves that exist in the game move pool', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    expect(result.moves.length).toBe(4);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).toContain('flamethrower');
    expect(names).toContain('earthquake');
  });

  test('skips moves that are not in the game move pool', () => {
    const result = parsePokemon(UNKNOWN_MOVE_BLOCK);
    expect(result).not.toBeNull();
    // NOTAREAL_MOVE_XYZ is skipped; the other 3 valid moves are kept
    expect(result.moves).toHaveLength(3);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).not.toContain('notareal_move_xyz');
    expect(names).toContain('flamethrower');
    expect(names).toContain('dragon claw');
    expect(names).toContain('earthquake');
  });

  test('each move has correct pp tracking object', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    for (const move of result.moves) {
      expect(move.pp).toBeDefined();
      expect(typeof move.pp.max).toBe('number');
      expect(move.pp.max).toBeGreaterThan(0);
      expect(move.pp.current).toBe(move.pp.max);
    }
  });
});

describe('parsePokemon — stats and metadata', () => {
  test('parses level', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    expect(result.level).toBe(50);
  });

  test('defaults level to 100 when not specified', () => {
    const block = 'Charizard\n- Flamethrower\n- Dragon Claw\n- Earthquake\n- Slash';
    const result = parsePokemon(block);
    expect(result?.level).toBe(100);
  });

  test('parses EVs with correct stat totals', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    expect(result.evs).toBeDefined();
    // 252 SpA / 4 SpD / 252 Spe; all others 0
    const totalEvs = Object.values(result.evs).reduce((a, b) => a + b, 0);
    expect(totalEvs).toBe(508); // 252 + 4 + 252
  });

  test('defaults IVs to 31 when not specified', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    for (const iv of Object.values(result.ivs)) {
      expect(iv).toBe(31);
    }
  });

  test('parses nature', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    expect(result.nature).toBeDefined();
  });

  test('parses item', () => {
    const result = parsePokemon(NICKNAMED_BLOCK);
    expect(result.item).toBe('Charcoal');
  });

  test('item is null when not specified', () => {
    const result = parsePokemon(CHARIZARD_BLOCK);
    expect(result.item).toBeNull();
  });

  test('sets exp to 0', () => {
    expect(parsePokemon(CHARIZARD_BLOCK).exp).toBe(0);
  });
});

// ── parseTeam ─────────────────────────────────────────────────────────────────

describe('parseTeam', () => {
  test('parses multiple blocks separated by blank lines', () => {
    const team = parseTeam(TWO_TEAM_TEXT);
    expect(team.length).toBe(2);
  });

  test('filters out blocks with unknown species', () => {
    const text = `${CHARIZARD_BLOCK}\n\n${UNKNOWN_SPECIES_BLOCK}`;
    const team = parseTeam(text);
    expect(team.length).toBe(1);
  });

  test('assigns sequential pids starting at 1', () => {
    const team = parseTeam(TWO_TEAM_TEXT);
    expect(team[0].pid).toBe(1);
    expect(team[1].pid).toBe(2);
  });

  test('returns empty array for empty input', () => {
    expect(parseTeam('')).toEqual([]);
    expect(parseTeam(null)).toEqual([]);
  });

  test('caps the team at 6 Pokémon', () => {
    const text = Array(8).fill(CHARIZARD_BLOCK).join('\n\n');
    expect(parseTeam(text).length).toBe(6);
  });
});

// ── Generation representatives ────────────────────────────────────────────────
// The parser uses the Pokémon Sword Pokédex (652 species) so all generations
// are recognised.  Each test verifies correct nat_dex_id and that the species-
// specific moves parse without error.

describe('generation representatives — parsePokemon', () => {
  test('Gen 1 — Charizard (#6): parses successfully', () => {
    const result = parsePokemon(GEN1_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(6);
  });

  test('Gen 1 — Charizard: all four moves are included', () => {
    const result = parsePokemon(GEN1_BLOCK);
    expect(result.moves).toHaveLength(4);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).toContain('flamethrower');
    expect(names).toContain('fire blast');
    expect(names).toContain('dragon claw');
    expect(names).toContain('earthquake');
  });

  test('Gen 2 — Tyranitar (#248): parses successfully', () => {
    const result = parsePokemon(GEN2_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(248);
  });

  test('Gen 2 — Tyranitar: all four moves are included', () => {
    const result = parsePokemon(GEN2_BLOCK);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).toContain('rock slide');
    expect(names).toContain('crunch');
    expect(names).toContain('earthquake');
    expect(names).toContain('thunder wave');
  });

  test('Gen 3 — Salamence (#373): parses successfully', () => {
    const result = parsePokemon(GEN3_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(373);
  });

  test('Gen 4 — Garchomp (#445): parses successfully', () => {
    const result = parsePokemon(GEN4_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(445);
  });

  test('Gen 4 — Garchomp: Gen 4 moves (Stone Edge, Outrage) are included', () => {
    const result = parsePokemon(GEN4_BLOCK);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).toContain('stone edge');
    expect(names).toContain('outrage');
  });

  test('Gen 5 — Hydreigon (#635): parses successfully', () => {
    const result = parsePokemon(GEN5_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(635);
  });

  test('Gen 5 — Hydreigon: Gen 4/5 moves (Dragon Pulse, Dark Pulse) are included', () => {
    const result = parsePokemon(GEN5_BLOCK);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).toContain('dragon pulse');
    expect(names).toContain('dark pulse');
  });

  test('Gen 6 — Aegislash (#681): parses successfully', () => {
    const result = parsePokemon(GEN6_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(681);
  });

  test('Gen 7 — Mimikyu (#778): parses successfully', () => {
    const result = parsePokemon(GEN7_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(778);
  });

  test('Gen 7 — Mimikyu: Gen 6 move Play Rough is included', () => {
    const result = parsePokemon(GEN7_BLOCK);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).toContain('play rough');
  });

  test('Gen 8 — Corviknight (#823): parses successfully', () => {
    const result = parsePokemon(GEN8_BLOCK);
    expect(result).not.toBeNull();
    expect(result.species).toBe(823);
  });

  test('Gen 8 — Corviknight: Gen 4/5 moves (Iron Head, Brave Bird) are included', () => {
    const result = parsePokemon(GEN8_BLOCK);
    const names = result.moves.map(m => m.name.toLowerCase());
    expect(names).toContain('iron head');
    expect(names).toContain('brave bird');
  });
});

describe('generation representatives — parseTeam with mixed generations', () => {
  test('a team with one Pokémon from each Gen 1-8 yields all 8 (within 6-slot cap)', () => {
    const text = [GEN1_BLOCK, GEN2_BLOCK, GEN3_BLOCK, GEN4_BLOCK,
                  GEN5_BLOCK, GEN6_BLOCK, GEN7_BLOCK, GEN8_BLOCK].join('\n\n');
    const team = parseTeam(text);
    // parseTeam caps at 6; all 8 are valid but only first 6 are kept
    expect(team).toHaveLength(6);
    expect(team[0].species).toBe(6);   // Charizard
    expect(team[1].species).toBe(248); // Tyranitar
    expect(team[2].species).toBe(373); // Salamence
    expect(team[3].species).toBe(445); // Garchomp
    expect(team[4].species).toBe(635); // Hydreigon
    expect(team[5].species).toBe(681); // Aegislash
  });

  test('all 8 reps parse to non-null individually', () => {
    for (const block of [GEN1_BLOCK, GEN2_BLOCK, GEN3_BLOCK, GEN4_BLOCK,
                         GEN5_BLOCK, GEN6_BLOCK, GEN7_BLOCK, GEN8_BLOCK]) {
      expect(parsePokemon(block)).not.toBeNull();
    }
  });
});
