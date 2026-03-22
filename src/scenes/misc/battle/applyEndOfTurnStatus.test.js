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
