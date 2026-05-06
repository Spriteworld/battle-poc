import { STATS, STATUS, GEN_3 } from '@spriteworld/pokemon-data';

export function makeEvents() {
  const once       = {};  // fired once then removed
  const persistent = {};  // fired every time until off()
  return {
    on(name, fn) {
      if (!persistent[name]) persistent[name] = [];
      persistent[name].push(fn);
    },
    once(name, fn) {
      if (!once[name]) once[name] = [];
      once[name].push(fn);
    },
    emit(name, ...args) {
      (persistent[name] ?? []).forEach(fn => fn(...args));
      const fns = once[name] ?? [];
      delete once[name];
      fns.forEach(fn => fn(...args));
    },
    off(name) {
      delete once[name];
      delete persistent[name];
    },
    eventNames() {
      return [...new Set([...Object.keys(once), ...Object.keys(persistent)])];
    },
  };
}

export function makeMenu(name) {
  const items = [];
  return {
    name,
    config: { menuItems: items, selected: false, menuItemIndex: 0 },
    clear:        jest.fn(() => { items.length = 0; }),
    remap:        jest.fn(),
    populate:     jest.fn((list, _opts) => list.forEach((_, i) => items.push({ text: () => String(i) }))),
    deselect:     jest.fn(),
    select:       jest.fn(),
    setVisible:   jest.fn(),
    setActiveTab: jest.fn(),
    addMenuItem:  jest.fn(label => items.push({ text: () => label })),
    useGridMode:  jest.fn(),
    useListMode:  jest.fn(),
    setMoveMeta:  jest.fn(),
  };
}

let _monCounter = 0;
export function makeMon(overrides = {}) {
  const base = {
    id:        `mock-mon-${++_monCounter}`,
    pid:       'mock-pid',
    currentHp: 100,
    maxHp:     100,
    stats:     { [STATS.SPEED]: 100 },
    moves: [
      { name: 'Tackle', pp: { current: 35, max: 35 } },
      { name: 'Growl',  pp: { current: 40, max: 40 } },
    ],
    getName:          jest.fn(() => 'MockMon'),
    nameWithHP:       jest.fn(() => 'MockMon (100/100)'),
    isAlive:          jest.fn(() => true),
    getMoves:         jest.fn(() => [
      { name: 'Tackle', pp: { current: 35, max: 35 } },
      { name: 'Growl',  pp: { current: 40, max: 40 } },
    ]),
    hasAbility:       jest.fn(() => false),
    mustStruggle:     jest.fn(() => false),
    attack:           jest.fn(() => ({ move: 'Tackle', enemy: 'Foe', damage: 10, accuracy: 1, critical: 1, typeEffectiveness: 1 })),
    attackRandomMove: jest.fn(() => ({ move: 'Tackle', enemy: 'Foe', damage: 10, accuracy: 1, critical: 1, typeEffectiveness: 1 })),
    attackWithAI:     jest.fn(() => ({ move: 'Tackle', enemy: 'Foe', damage: 10, accuracy: 1, critical: 1, typeEffectiveness: 1 })),
    attackLocked:     jest.fn(() => ({ move: 'Fly', enemy: 'Foe', damage: 15, accuracy: 1, critical: 1, typeEffectiveness: 1 })),
    attackMultiHit:   jest.fn(() => ({ move: 'Fury Attack', enemy: 'Foe', damage: 30, accuracy: 1, critical: 1, typeEffectiveness: 1, hits: 3, hitResults: [{ damage: 10, critical: 1 }, { damage: 10, critical: 1 }, { damage: 10, critical: 1 }] })),
    takeDamage:       jest.fn(),
    useItem:          jest.fn(() => ({ message: 'HP restored!' })),
    lockedMove:  null,
    invulnerable: false,
    flinched:    false,
    status: {
      [STATUS.SLEEP]: 0,
      [STATUS.POISON]: 0,
      [STATUS.BURN]: 0,
      [STATUS.FROZEN]: 0,
      [STATUS.PARALYZE]: 0,
      [STATUS.TOXIC]: 0,
    },
    stages: {
      [STATS.ATTACK]: 0,
      [STATS.DEFENSE]: 0,
      [STATS.SPECIAL_ATTACK]: 0,
      [STATS.SPECIAL_DEFENSE]: 0,
      [STATS.SPEED]: 0,
      ACCURACY: 0,
      EVASION: 0,
    },
    toxicCount: 0,
    ability: { name: 'none' },
    heldItem:     null,
    consumedItem: null,
    volatileStatus: { leechSeed: false, infatuated: false, magicCoat: false, yawnCounter: 0, wishPending: null, encored: null, disabledMove: null, furyCutterCount: 0, rolloutCount: 0, confusedTurns: 0, trapped: null, ingrained: false, stockpileCount: 0, nightmare: false, cursed: false, focusEnergy: false, perishSongCount: 0, taunted: 0, tormented: false, identified: false, lockedOn: false, charged: false, snatching: false, rampaging: null, substitute: null, destinyBond: false, imprisoning: false, grudge: false, protected: false, protectCount: 0, enduring: false, uproaring: null, biding: null, flashFire: false, truantLoaf: false },
    _lastReceivedDamage: null,
    lastUsedMove: null,
    applyStageChange: jest.fn((stat, delta) => ({ message: `MockMon's ${stat} changed by ${delta}!` })),
  };
  return { ...base, ...overrides };
}

export function makeContext(overrides = {}) {
  const playerMon = makeMon({ getName: jest.fn(() => 'Bulbasaur') });
  const enemyMon  = makeMon({ getName: jest.fn(() => 'Pikachu'), stats: { [STATS.SPEED]: 80 } });

  const player = {
    getName:   jest.fn(() => 'Player'),
    isWild:    false,
    isTrainer: true,
    team: {
      pokemon:          [playerMon],
      active:           0,
      getActivePokemon: jest.fn(() => playerMon),
      setActivePokemon: jest.fn(),
      hasLivingPokemon: jest.fn(() => true),
    },
    ai: { selectMove: jest.fn(), shouldSwitch: jest.fn(() => null) },
  };

  const enemy = {
    getName:   jest.fn(() => 'Rival'),
    isWild:    false,
    isTrainer: true,
    team: {
      pokemon:          [enemyMon],
      getActivePokemon: jest.fn(() => enemyMon),
      setActivePokemon: jest.fn(),
      hasLivingPokemon: jest.fn(() => true),
    },
    ai: { selectMove: jest.fn(), shouldSwitch: jest.fn(() => null) },
  };

  const ctx = {
    game:         { events: makeEvents() },
    logger:       { addItem: jest.fn(), flush: jest.fn(cb => cb?.()), showText: jest.fn() },
    stateMachine: { setState: jest.fn() },
    stateDef: {
      BATTLE_IDLE:               'battleIdle',
      BATTLE_START:              'battleStart',
      BEFORE_ACTION:             'beforeAction',
      PLAYER_ACTION:             'playerAction',
      PLAYER_ATTACK:             'playerAttack',
      PLAYER_BAG:                'playerBag',
      PLAYER_POKEMON:            'playerPokemon',
      PLAYER_NEW_ACTIVE_POKEMON: 'playerNewActivePokemon',
      ENEMY_ACTION:              'enemyAction',
      APPLY_ACTIONS:             'applyActions',
      BATTLE_END:                'battleEnd',
      BATTLE_WON:                'battleWon',
      BATTLE_LOST:               'battleLost',
      POKEMON_CAUGHT:            'pokemonCaught',
    },
    events:  makeEvents(),
    config:  { player, enemy, field: {} },
    data: {
      player: { name: 'Player', inventory: { items: [] } },
      enemy:  { name: 'Rival' },
      field:  {},
    },
    actions:        {},
    currentAction:  null,
    generation:     GEN_3,
    escapeAttempts: 0,
    screens: {
      player: { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
    },
    weather: { type: null, turnsLeft: 0 },
    time: {
      addEvent: jest.fn(({ callback, callbackScope }) => callback.call(callbackScope)),
    },
    remapActivePokemon:        jest.fn(),
    playAttackAnimation:       jest.fn((_a, _b, cb) => cb?.()),
    checkForDeadActivePokemon: jest.fn(() => null),
    applyEndOfTurnStatus:      jest.fn(),
    activateMenu:              jest.fn(),
    BattleMenu:        makeMenu('battlemenu'),
    AttackMenu:        makeMenu('attackmenu'),
    BagMenu:           makeMenu('bagmenu'),
    PokemonTeamMenu:   makeMenu('pokemonteammenu'),
    PokemonSwitchMenu: makeMenu('pokemonswitchmenu'),
    ActivePokemonMenu: { select: jest.fn(), waitForExpAnimation: jest.fn(cb => cb()) },
    selectedItem:    undefined,
    selectedPokemon: undefined,
  };

  return Object.assign(ctx, overrides);
}
