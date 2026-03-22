import { STATS, GEN_3 } from '@spriteworld/pokemon-data';

export function makeEvents() {
  const handlers = {};
  return {
    once(name, fn) {
      if (!handlers[name]) handlers[name] = [];
      handlers[name].push(fn);
    },
    emit(name, ...args) {
      const fns = handlers[name] || [];
      delete handlers[name];
      fns.forEach(fn => fn(...args));
    },
    off(name) { delete handlers[name]; },
    eventNames() { return Object.keys(handlers); },
  };
}

export function makeMenu(name) {
  const items = [];
  return {
    name,
    config: { menuItems: items, selected: false, menuItemIndex: 0 },
    clear:       jest.fn(() => { items.length = 0; }),
    remap:       jest.fn(),
    deselect:    jest.fn(),
    select:      jest.fn(),
    setVisible:  jest.fn(),
    addMenuItem: jest.fn(label => items.push({ text: () => label })),
  };
}

export function makeMon(overrides = {}) {
  const base = {
    currentHp: 100,
    maxHp:     100,
    stats:     { [STATS.SPEED]: 100 },
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
    attackMultiHit:   jest.fn(() => ({ move: 'Fury Attack', enemy: 'Foe', damage: 30, accuracy: 1, critical: 1, typeEffectiveness: 1, hits: 3 })),
    useItem:          jest.fn(() => ({ message: 'HP restored!' })),
    lockedMove:  null,
    invulnerable: false,
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
      getActivePokemon: jest.fn(() => playerMon),
      setActivePokemon: jest.fn(),
      hasLivingPokemon: jest.fn(() => true),
    },
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
  };

  const ctx = {
    logger:       { addItem: jest.fn() },
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
    time: {
      addEvent: jest.fn(({ callback, callbackScope }) => callback.call(callbackScope)),
    },
    remapActivePokemon:        jest.fn(),
    checkForDeadActivePokemon: jest.fn(() => null),
    activateMenu:              jest.fn(),
    BattleMenu:        makeMenu('battlemenu'),
    AttackMenu:        makeMenu('attackmenu'),
    BagMenu:           makeMenu('bagmenu'),
    PokemonTeamMenu:   makeMenu('pokemonteammenu'),
    PokemonSwitchMenu: makeMenu('pokemonswitchmenu'),
    ActivePokemonMenu: { select: jest.fn() },
    selectedItem:    undefined,
    selectedPokemon: undefined,
  };

  return Object.assign(ctx, overrides);
}
