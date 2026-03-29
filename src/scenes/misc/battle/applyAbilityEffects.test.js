import { Abilities } from '@spriteworld/pokemon-data';
import {
  isWeatherSuppressed,
  getAbilitySpeedModifier,
  applyAbilityEOT,
} from './applyAbilityEffects.js';

function makeMon(abilityName = null, overrides = {}) {
  return {
    currentHp: 100,
    maxHp:     100,
    status:    {},
    stages:    {},
    isAlive:         jest.fn(() => true),
    hasAbility:      jest.fn(name => name === abilityName),
    getName:         jest.fn(() => 'TestMon'),
    takeDamage:      jest.fn(),
    applyStageChange: jest.fn(),
    ...overrides,
  };
}

function makeLogger() {
  return { addItem: jest.fn() };
}

// ─── isWeatherSuppressed ───────────────────────────────────────────────────────

describe('isWeatherSuppressed', () => {
  test('returns false when neither mon has a suppression ability', () => {
    expect(isWeatherSuppressed(makeMon(), makeMon())).toBe(false);
  });

  test('returns true when mon1 has Cloud Nine', () => {
    expect(isWeatherSuppressed(makeMon(Abilities.CLOUD_NINE), makeMon())).toBe(true);
  });

  test('returns true when mon1 has Air Lock', () => {
    expect(isWeatherSuppressed(makeMon(Abilities.AIR_LOCK), makeMon())).toBe(true);
  });

  test('returns true when mon2 has Cloud Nine', () => {
    expect(isWeatherSuppressed(makeMon(), makeMon(Abilities.CLOUD_NINE))).toBe(true);
  });

  test('returns true when mon2 has Air Lock', () => {
    expect(isWeatherSuppressed(makeMon(), makeMon(Abilities.AIR_LOCK))).toBe(true);
  });

  test('returns false when mon2 is omitted', () => {
    expect(isWeatherSuppressed(makeMon())).toBe(false);
  });

  test('returns false when mon is null', () => {
    expect(isWeatherSuppressed(null, null)).toBe(false);
  });
});

// ─── getAbilitySpeedModifier ───────────────────────────────────────────────────

describe('getAbilitySpeedModifier', () => {
  test('returns 2 for Swift Swim in rain', () => {
    expect(getAbilitySpeedModifier(makeMon(Abilities.SWIFT_SWIM), { type: 'rain' })).toBe(2);
  });

  test('returns 2 for Chlorophyll in sun', () => {
    expect(getAbilitySpeedModifier(makeMon(Abilities.CHLOROPHYLL), { type: 'sun' })).toBe(2);
  });

  test('returns 1 for Swift Swim in rain when the opponent has Cloud Nine', () => {
    const mon      = makeMon(Abilities.SWIFT_SWIM);
    const opponent = makeMon(Abilities.CLOUD_NINE);
    expect(getAbilitySpeedModifier(mon, { type: 'rain' }, opponent)).toBe(1);
  });

  test('returns 1 for Chlorophyll in sun when the opponent has Air Lock', () => {
    const mon      = makeMon(Abilities.CHLOROPHYLL);
    const opponent = makeMon(Abilities.AIR_LOCK);
    expect(getAbilitySpeedModifier(mon, { type: 'sun' }, opponent)).toBe(1);
  });

  test('returns 1 when weather type is irrelevant for the ability', () => {
    expect(getAbilitySpeedModifier(makeMon(Abilities.SWIFT_SWIM), { type: 'sun' })).toBe(1);
  });

  test('returns 1 with no weather', () => {
    expect(getAbilitySpeedModifier(makeMon(Abilities.SWIFT_SWIM), null)).toBe(1);
  });

  test('returns 1 for a mon with no relevant ability', () => {
    expect(getAbilitySpeedModifier(makeMon(), { type: 'rain' })).toBe(1);
  });
});

// ─── applyAbilityEOT — Rain Dish ──────────────────────────────────────────────

describe('applyAbilityEOT — Rain Dish', () => {
  test('heals 1/16 max HP in rain', () => {
    const mon    = makeMon(Abilities.RAIN_DISH, { maxHp: 160, currentHp: 100 });
    const logger = makeLogger();
    applyAbilityEOT(mon, { type: 'rain', turnsLeft: 3 }, logger);
    expect(mon.currentHp).toBe(110); // 100 + floor(160/16) = 110
    expect(logger.addItem).toHaveBeenCalledWith(expect.stringContaining('Rain Dish'));
  });

  test('clamps heal to maxHp', () => {
    const mon    = makeMon(Abilities.RAIN_DISH, { maxHp: 160, currentHp: 158 });
    const logger = makeLogger();
    applyAbilityEOT(mon, { type: 'rain', turnsLeft: 3 }, logger);
    expect(mon.currentHp).toBe(160);
  });

  test('does not heal when Cloud Nine suppresses weather (opponent has Cloud Nine)', () => {
    const mon      = makeMon(Abilities.RAIN_DISH, { maxHp: 160, currentHp: 100 });
    const opponent = makeMon(Abilities.CLOUD_NINE);
    const logger   = makeLogger();
    applyAbilityEOT(mon, { type: 'rain', turnsLeft: 3 }, logger, opponent);
    expect(mon.currentHp).toBe(100);
    expect(logger.addItem).not.toHaveBeenCalled();
  });

  test('does not heal when Air Lock suppresses weather (opponent has Air Lock)', () => {
    const mon      = makeMon(Abilities.RAIN_DISH, { maxHp: 160, currentHp: 100 });
    const opponent = makeMon(Abilities.AIR_LOCK);
    const logger   = makeLogger();
    applyAbilityEOT(mon, { type: 'rain', turnsLeft: 3 }, logger, opponent);
    expect(mon.currentHp).toBe(100);
  });

  test('does not heal outside of rain', () => {
    const mon    = makeMon(Abilities.RAIN_DISH, { maxHp: 160, currentHp: 100 });
    const logger = makeLogger();
    applyAbilityEOT(mon, { type: 'sun', turnsLeft: 3 }, logger);
    expect(mon.currentHp).toBe(100);
    expect(logger.addItem).not.toHaveBeenCalled();
  });
});

// ─── applyAbilityEOT — Dry Skin ───────────────────────────────────────────────

describe('applyAbilityEOT — Dry Skin', () => {
  test('heals 1/8 max HP in rain', () => {
    const mon    = makeMon(Abilities.DRY_SKIN, { maxHp: 160, currentHp: 100 });
    const logger = makeLogger();
    applyAbilityEOT(mon, { type: 'rain', turnsLeft: 3 }, logger);
    expect(mon.currentHp).toBe(120); // 100 + floor(160/8) = 120
    expect(logger.addItem).toHaveBeenCalledWith(expect.stringContaining('Dry Skin'));
  });

  test('takes 1/8 max HP damage in sun', () => {
    const mon    = makeMon(Abilities.DRY_SKIN, { maxHp: 160, currentHp: 100 });
    const logger = makeLogger();
    applyAbilityEOT(mon, { type: 'sun', turnsLeft: 3 }, logger);
    expect(mon.takeDamage).toHaveBeenCalledWith(20); // floor(160/8)
    expect(logger.addItem).toHaveBeenCalledWith(expect.stringContaining('Dry Skin'));
  });

  test('does not heal in rain when Cloud Nine suppresses weather', () => {
    const mon      = makeMon(Abilities.DRY_SKIN, { maxHp: 160, currentHp: 100 });
    const opponent = makeMon(Abilities.CLOUD_NINE);
    const logger   = makeLogger();
    applyAbilityEOT(mon, { type: 'rain', turnsLeft: 3 }, logger, opponent);
    expect(mon.currentHp).toBe(100);
    expect(logger.addItem).not.toHaveBeenCalled();
  });

  test('does not take damage in sun when Air Lock suppresses weather', () => {
    const mon      = makeMon(Abilities.DRY_SKIN, { maxHp: 160, currentHp: 100 });
    const opponent = makeMon(Abilities.AIR_LOCK);
    const logger   = makeLogger();
    applyAbilityEOT(mon, { type: 'sun', turnsLeft: 3 }, logger, opponent);
    expect(mon.takeDamage).not.toHaveBeenCalled();
    expect(logger.addItem).not.toHaveBeenCalled();
  });
});
