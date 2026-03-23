import { STATUS } from '@spriteworld/pokemon-data';
import { makeContext } from './states/stateTestHelpers.js';
import applyEndOfTurnStatus from './applyEndOfTurnStatus.js';

function call(ctx) {
  applyEndOfTurnStatus.call(ctx);
}

// ─── Burn ─────────────────────────────────────────────────────────────────────

describe('applyEndOfTurnStatus — burn', () => {
  test('deals 1/8 max HP to a burned Pokémon', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.maxHp = 160;
    playerMon.status[STATUS.BURN] = 1;
    call(ctx);
    expect(playerMon.takeDamage).toHaveBeenCalledWith(20); // floor(160/8)
  });

  test('logs the burn damage message', () => {
    const ctx = makeContext();
    ctx.config.player.team.getActivePokemon().status[STATUS.BURN] = 1;
    call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('hurt by its burn'));
  });

  test('does not tick a Pokémon with no burn', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    call(ctx);
    expect(playerMon.takeDamage).not.toHaveBeenCalled();
  });
});

// ─── Poison ───────────────────────────────────────────────────────────────────

describe('applyEndOfTurnStatus — poison', () => {
  test('deals 1/8 max HP to a poisoned Pokémon', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.maxHp = 80;
    playerMon.status[STATUS.POISON] = 1;
    call(ctx);
    expect(playerMon.takeDamage).toHaveBeenCalledWith(10); // floor(80/8)
  });

  test('logs the poison damage message', () => {
    const ctx = makeContext();
    ctx.config.player.team.getActivePokemon().status[STATUS.POISON] = 1;
    call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('hurt by poison'));
  });

  test('deals at least 1 damage even for tiny max HP', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.maxHp = 1;
    playerMon.status[STATUS.POISON] = 1;
    call(ctx);
    expect(playerMon.takeDamage).toHaveBeenCalledWith(1);
  });
});

// ─── Toxic ────────────────────────────────────────────────────────────────────

describe('applyEndOfTurnStatus — toxic', () => {
  test('increments toxicCount each turn', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.toxicCount = 0;
    playerMon.status[STATUS.TOXIC] = 1;
    call(ctx);
    expect(playerMon.toxicCount).toBe(1);
  });

  test('deals floor(maxHp × toxicCount / 16) on turn 1', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.maxHp = 160;
    playerMon.toxicCount = 0;
    playerMon.status[STATUS.TOXIC] = 1;
    call(ctx);
    expect(playerMon.takeDamage).toHaveBeenCalledWith(10); // floor(160 * 1 / 16)
  });

  test('escalates damage on subsequent turns', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.maxHp = 160;
    playerMon.toxicCount = 3;
    playerMon.status[STATUS.TOXIC] = 1;
    call(ctx);
    expect(playerMon.takeDamage).toHaveBeenCalledWith(40); // floor(160 * 4 / 16)
  });

  test('logs a badly poisoned message', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.status[STATUS.TOXIC] = 1;
    call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('poison'));
  });
});

// ─── Dead Pokémon ──────────────────────────────────────────────────────────────

describe('applyEndOfTurnStatus — skips fainted Pokémon', () => {
  test('does not deal damage to a fainted Pokémon', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.isAlive.mockReturnValue(false);
    playerMon.status[STATUS.BURN] = 1;
    call(ctx);
    expect(playerMon.takeDamage).not.toHaveBeenCalled();
  });
});

// ─── Yawn ─────────────────────────────────────────────────────────────────────

describe('applyEndOfTurnStatus — yawn', () => {
  test('decrements yawnCounter each EOT', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.volatileStatus.yawnCounter = 2;
    call(ctx);
    expect(playerMon.volatileStatus.yawnCounter).toBe(1);
  });

  test('applies sleep when yawnCounter reaches 0', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.volatileStatus.yawnCounter = 1;
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // sleep = 4 turns
    call(ctx);
    expect(playerMon.status[STATUS.SLEEP]).toBeGreaterThan(0);
    jest.spyOn(Math, 'random').mockRestore();
  });

  test('logs a "fell asleep" message when sleep is applied', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.volatileStatus.yawnCounter = 1;
    call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('fell asleep'));
  });

  test('does not apply sleep if the target already has a status condition', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.volatileStatus.yawnCounter = 1;
    playerMon.status[STATUS.POISON] = 1;
    call(ctx);
    expect(playerMon.status[STATUS.SLEEP]).toBe(0);
  });

  test('does not decrement for a fainted Pokémon', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.isAlive.mockReturnValue(false);
    playerMon.volatileStatus.yawnCounter = 2;
    call(ctx);
    expect(playerMon.volatileStatus.yawnCounter).toBe(2);
  });
});

// ─── Wish ─────────────────────────────────────────────────────────────────────

describe('applyEndOfTurnStatus — wish', () => {
  function setWishPending(mon, turnsLeft, healAmount = 50) {
    mon.volatileStatus.wishPending = { healAmount, turnsLeft };
  }

  test('decrements turnsLeft each EOT', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    setWishPending(playerMon, 2);
    call(ctx);
    expect(playerMon.volatileStatus.wishPending.turnsLeft).toBe(1);
  });

  test('heals the active Pokémon when turnsLeft reaches 0', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.currentHp = 30;
    playerMon.maxHp = 100;
    setWishPending(playerMon, 1, 50);
    call(ctx);
    expect(playerMon.currentHp).toBe(80);
  });

  test('clamps heal to maxHp', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.currentHp = 90;
    playerMon.maxHp = 100;
    setWishPending(playerMon, 1, 50);
    call(ctx);
    expect(playerMon.currentHp).toBe(100);
  });

  test('logs a "wish came true" message', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    setWishPending(playerMon, 1);
    call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('wish came true'));
  });

  test('clears wishPending after it resolves', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    setWishPending(playerMon, 1);
    call(ctx);
    expect(playerMon.volatileStatus.wishPending).toBeNull();
  });

  test('does not heal if the active Pokémon is fainted', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.isAlive.mockReturnValue(false);
    playerMon.currentHp = 0;
    setWishPending(playerMon, 1, 50);
    call(ctx);
    expect(playerMon.currentHp).toBe(0);
  });

  test('heals the currently active Pokémon even if the wisher switched out', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    // Simulate wisher is on the bench (wishPending on playerMon but a different mon is active)
    setWishPending(playerMon, 1, 40);

    const activeMon = {
      currentHp: 20, maxHp: 100,
      isAlive: jest.fn(() => true),
      getName: jest.fn(() => 'ActiveMon'),
      status: { BURN: 0, POISON: 0, SLEEP: 0, FROZEN: 0, PARALYZE: 0, TOXIC: 0 },
      volatileStatus: { leechSeed: false, yawnCounter: 0, magicCoat: false },
      toxicCount: 0,
      takeDamage: jest.fn(),
      flinched: false,
    };
    ctx.config.player.team.getActivePokemon.mockReturnValue(activeMon);
    // Keep playerMon in the team's pokemon array so the wish finder can find it
    ctx.config.player.team.pokemon = [playerMon, activeMon];

    call(ctx);
    expect(activeMon.currentHp).toBe(60);
  });
});

// ─── Leech Seed ────────────────────────────────────────────────────────────────

describe('applyEndOfTurnStatus — leech seed', () => {
  test('seeded Pokémon takes floor(maxHp / 8) damage', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.maxHp = 160;
    playerMon.volatileStatus.leechSeed = true;
    call(ctx);
    expect(playerMon.takeDamage).toHaveBeenCalledWith(20); // floor(160/8)
  });

  test('opponent gains the drained HP', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    playerMon.maxHp = 160;
    playerMon.volatileStatus.leechSeed = true;
    enemyMon.currentHp = 50;
    enemyMon.maxHp = 160;
    call(ctx);
    expect(enemyMon.currentHp).toBe(70); // 50 + floor(160/8)
  });

  test('opponent HP does not exceed maxHp', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    playerMon.maxHp = 160;
    playerMon.volatileStatus.leechSeed = true;
    enemyMon.currentHp = 155;
    enemyMon.maxHp = 160;
    call(ctx);
    expect(enemyMon.currentHp).toBe(160);
  });

  test('logs a Leech Seed sap message', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.volatileStatus.leechSeed = true;
    call(ctx);
    expect(ctx.logger.addItem).toHaveBeenCalledWith(expect.stringContaining('Leech Seed'));
  });

  test('non-seeded Pokémon is unaffected', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    // volatileStatus.leechSeed defaults to false in stateTestHelpers
    call(ctx);
    expect(playerMon.takeDamage).not.toHaveBeenCalled();
  });

  test('fainted seeded Pokémon is skipped', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.isAlive.mockReturnValue(false);
    playerMon.volatileStatus.leechSeed = true;
    call(ctx);
    expect(playerMon.takeDamage).not.toHaveBeenCalled();
  });

  test('does not heal a fainted opponent', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    const enemyMon  = ctx.config.enemy.team.getActivePokemon();
    playerMon.maxHp = 160;
    playerMon.volatileStatus.leechSeed = true;
    enemyMon.isAlive.mockReturnValue(false);
    enemyMon.currentHp = 0;
    enemyMon.maxHp = 160;
    call(ctx);
    expect(enemyMon.currentHp).toBe(0);
  });

  test('deals at least 1 damage for tiny max HP', () => {
    const ctx = makeContext();
    const playerMon = ctx.config.player.team.getActivePokemon();
    playerMon.maxHp = 1;
    playerMon.volatileStatus.leechSeed = true;
    call(ctx);
    expect(playerMon.takeDamage).toHaveBeenCalledWith(1);
  });
});
