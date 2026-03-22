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
