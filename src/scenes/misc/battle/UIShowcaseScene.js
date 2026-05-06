import Phaser from 'phaser';
import BattleLogger from '@Objects/ui/BattleLogger.js';
import FieldScreensDisplay from '@Objects/ui/FieldScreensDisplay.js';
import WeatherDisplay from '@Objects/ui/WeatherDisplay.js';
import BattlePokemonSprite from '@Objects/battlescene/BattlePokemonSprite.js';
import PokemonStatusBox from '@Objects/ui/PokemonStatusBox.js';
import EnemyTrainerStatusBox from '@Objects/ui/EnemyTrainerStatusBox.js';
import { GENDERS, GROWTH } from '@spriteworld/pokemon-data';

// ─── Layout (mirrors BattleScene2) ────────────────────────────────────────────
const UI_Y     = 370;
const UI_H     = 230;
const DIALOG_W = 490;
const ACTION_X = 490;
const ENEMY_BOX  = { x: 20,  y: 15  };
const PLAYER_BOX = { x: 430, y: 288 };

// ─── Background palettes (same as BattleScene2) ───────────────────────────────
const BG_PALETTES = {
  null:      { skyTop: 0x78b8f0, skyBot: 0xb8dff8, gndTop: 0x68a838, gndBot: 0x48882a },
  rain:      { skyTop: 0x405878, skyBot: 0x708898, gndTop: 0x507030, gndBot: 0x385820 },
  sun:       { skyTop: 0xf8c840, skyBot: 0xfce880, gndTop: 0x88c030, gndBot: 0x68a020 },
  sandstorm: { skyTop: 0xc0a840, skyBot: 0xe0c870, gndTop: 0xa08028, gndBot: 0x806018 },
  hail:      { skyTop: 0x5878a0, skyBot: 0x90b0c8, gndTop: 0x508858, gndBot: 0x387040 },
};

// ─── Showcase states ──────────────────────────────────────────────────────────

/**
 * Each state exercises a distinct combination of HP, status conditions,
 * stat stages, weather, and field effects so every major UI component
 * shows a non-trivial rendering.
 */
const STATES = [
  // 0 — Mid-battle, rain, damage state
  {
    label:   'Mid-Battle — Rain',
    weather: { type: 'rain', turnsLeft: 5 },
    screens: {
      player: { lightScreen: 0, reflect: 5, mist: 0, safeguard: 0, spikes: 0,  toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 2,  toxicSpikes: 0, stealthRock: false },
    },
    playerBox: {
      name: 'CHARIZARD', level: 36, currentHp: 47, maxHp: 152,
      exp: 28000, growth: GROWTH.MEDIUM_SLOW,
      gender: GENDERS.MALE,
      status: { BURNED: 1 },
      stages: { ATTACK: 2, DEFENSE: -1 },
      volatileStatus: {},
    },
    enemyTrainer: { name: 'GARY', isWild: false },
    enemyTeam: [
      { currentHp: 84,  status: { PARALYZED: 1 }, seen: true,  getName: () => 'BLASTOISE', level: 40 },
      { currentHp: 120, status: {},               seen: true,  getName: () => 'PIDGEOT',   level: 36 },
      { currentHp: 0,   status: {},               seen: false, getName: () => 'ALAKAZAM',  level: 38 },
    ],
    enemyMon: {
      getName:       () => 'BLASTOISE',
      level:         40,
      currentHp:     84,
      maxHp:         140,
      gender:        GENDERS.MALE,
      status:        { PARALYZED: 1 },
      stages:        {},
      volatileStatus: {},
      pokerus:       0,
    },
    logText: 'GARY\'s BLASTOISE is paralysed!',
  },

  // 1 — Field set-up, harsh sun, full HP, both sides screened + hazards
  {
    label:   'Field Set-Up — Harsh Sun',
    weather: { type: 'sun', turnsLeft: 8 },
    screens: {
      player: { lightScreen: 8, reflect: 8, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 2, stealthRock: true  },
    },
    playerBox: {
      name: 'CHARIZARD', level: 36, currentHp: 152, maxHp: 152,
      exp: 32000, growth: GROWTH.MEDIUM_SLOW,
      gender: GENDERS.MALE,
      status: {},
      stages: {},
      volatileStatus: {},
    },
    enemyTrainer: { name: 'GARY', isWild: false },
    enemyTeam: [
      { currentHp: 140, status: {} },
      { currentHp: 120, status: {} },
      { currentHp: 95,  status: {} },
    ],
    enemyMon: {
      getName:       () => 'BLASTOISE',
      level:         40,
      currentHp:     140,
      maxHp:         140,
      gender:        GENDERS.MALE,
      status:        {},
      stages:        {},
      volatileStatus: {},
      pokerus:       0,
    },
    logText: 'The sunlight turned harsh!',
  },

  // 2 — Endgame, sandstorm, critical HP, volatile + stat stages, Toxic + Frozen
  {
    label:   'Endgame — Sandstorm',
    weather: { type: 'sandstorm', turnsLeft: 3 },
    screens: {
      player: { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
    },
    playerBox: {
      name: 'CHARIZARD', level: 36, currentHp: 8, maxHp: 152,
      exp: 34500, growth: GROWTH.MEDIUM_SLOW,
      gender: GENDERS.MALE,
      status: { TOXIC: 1 },
      stages: { DEFENSE: -2, SPEED: 2 },
      volatileStatus: { leechSeed: true, confusedTurns: 2 },
    },
    enemyTrainer: { name: 'GARY', isWild: false },
    enemyTeam: [
      { currentHp: 15, status: { FROZEN: 1 } },
      { currentHp: 0,  status: {} },
      { currentHp: 0,  status: {} },
    ],
    enemyMon: {
      getName:       () => 'BLASTOISE',
      level:         40,
      currentHp:     15,
      maxHp:         140,
      gender:        GENDERS.MALE,
      status:        { FROZEN: 1 },
      stages:        { SPECIAL_ATTACK: -1 },
      volatileStatus: {},
      pokerus:       0,
    },
    logText: 'The sandstorm rages on!',
  },

  // 3 — Wild encounter, hail, Pokérus, no trainer header on enemy box
  {
    label:   'Wild Encounter — Hail',
    weather: { type: 'hail', turnsLeft: 4 },
    screens: {
      player: { lightScreen: 0, reflect: 0, mist: 0, safeguard: 3, spikes: 0, toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 0, reflect: 0, mist: 0, safeguard: 0, spikes: 1, toxicSpikes: 1, stealthRock: true  },
    },
    playerBox: {
      name: 'CHARIZARD', level: 36, currentHp: 98, maxHp: 152,
      exp: 30000, growth: GROWTH.MEDIUM_SLOW,
      gender: GENDERS.FEMALE,
      status: { SLEEP: 2 },
      stages: { SPECIAL_ATTACK: 3, SPECIAL_DEFENSE: -2, ACCURACY: -1 },
      volatileStatus: {},
      pokerus: 1,
    },
    enemyTrainer: { name: '', isWild: true },
    enemyTeam: [],
    enemyMon: {
      getName:       () => 'LAPRAS',
      level:         28,
      currentHp:     112,
      maxHp:         150,
      gender:        null,
      status:        {},
      stages:        { DEFENSE: 1, SPEED: -1 },
      volatileStatus: { yawnCounter: 1 },
      pokerus:       0,
    },
    logText: 'A wild LAPRAS appeared!',
  },

  // 4 — Both sides fully screened (Light Screen + Reflect)
  {
    label:   'Dual Screens — Both Sides',
    weather: { type: null, turnsLeft: 0 },
    screens: {
      player: { lightScreen: 5, reflect: 5, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
      enemy:  { lightScreen: 5, reflect: 5, mist: 0, safeguard: 0, spikes: 0, toxicSpikes: 0, stealthRock: false },
    },
    playerBox: {
      name: 'CHARIZARD', level: 36, currentHp: 152, maxHp: 152,
      exp: 32000, growth: GROWTH.MEDIUM_SLOW,
      gender: GENDERS.MALE,
      status: {},
      stages: {},
      volatileStatus: {},
    },
    enemyTrainer: { name: 'GARY', isWild: false },
    enemyTeam: [
      { currentHp: 140, status: {} },
      { currentHp: 120, status: {} },
      { currentHp: 95,  status: {} },
    ],
    enemyMon: {
      getName:       () => 'BLASTOISE',
      level:         40,
      currentHp:     140,
      maxHp:         140,
      gender:        GENDERS.MALE,
      status:        {},
      stages:        {},
      volatileStatus: {},
      pokerus:       0,
    },
    logText: 'Both sides are shielded!',
  },
];

// ─── Scene ────────────────────────────────────────────────────────────────────

/**
 * Standalone Phaser scene that renders all major battle UI components in
 * several predefined states without running a real battle.
 *
 * Press ← / → (arrow keys) to cycle between states.
 */
export default class UIShowcaseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIShowcaseScene' });
  }

  init(data) {
    this._tilesetBaseUrl = data?.tilesetBaseUrl ?? import.meta.env.VITE_ASSETS_URL;
    this._stateIndex = 0;
  }

  create() {
    this._drawBackground();
    this._createComponents();
    this._setupKeys();
    this._applyState(false);
  }

  update(time) {
    this._weatherDisplay.tick(time);
  }

  // ─── Background ─────────────────────────────────────────────────────────────

  _drawBackground() {
    this._skyGfx    = this.add.graphics();
    this._groundGfx = this.add.graphics();

    const border = this.add.graphics();
    border.lineStyle(4, 0x181818);
    border.lineBetween(0, UI_Y, 800, UI_Y);
    border.lineBetween(ACTION_X, UI_Y, ACTION_X, 600);

    this._platformsGfx = this.add.graphics();
  }

  _updateBackground(weatherType) {
    const pal = BG_PALETTES[weatherType] ?? BG_PALETTES[null];
    this._skyGfx.clear();
    this._skyGfx.fillGradientStyle(pal.skyTop, pal.skyTop, pal.skyBot, pal.skyBot, 1);
    this._skyGfx.fillRect(0, 0, 800, UI_Y);
    this._groundGfx.clear();
    this._groundGfx.fillGradientStyle(pal.gndTop, pal.gndTop, pal.gndBot, pal.gndBot, 1);
    this._groundGfx.fillRect(0, UI_Y - 90, 800, 90);
  }

  _updatePlatforms(weatherType) {
    const color = weatherType === 'sandstorm' ? 0xb89060
                : weatherType === 'hail'      ? 0x70a888
                : 0x80b848;
    this._platformsGfx.clear();
    this._platformsGfx.fillStyle(color, 0.5);
    this._platformsGfx.fillEllipse(190, UI_Y - 28,  210, 40);
    this._platformsGfx.fillEllipse(610, UI_Y - 168, 170, 32);
  }

  // ─── Component creation ──────────────────────────────────────────────────────

  _createComponents() {
    this._weatherDisplay = new WeatherDisplay(this);
    this._fieldScreens   = new FieldScreensDisplay(this);

    this._enemyBox = new EnemyTrainerStatusBox(this, ENEMY_BOX.x, ENEMY_BOX.y);

    this._playerBox = new PokemonStatusBox(this, PLAYER_BOX.x, PLAYER_BOX.y, {
      showHpNumbers: true,
      isEnemy: false,
      width: 340,
    });

    this._logger = new BattleLogger(this, 0, UI_Y, DIALOG_W, UI_H);

    const url = this._tilesetBaseUrl;
    this._playerSprite = new BattlePokemonSprite(this, 190, UI_Y - 12, {
      species:       6,   // Charizard back sprite
      isBack:        true,
      size:          256,
      tilesetBaseUrl: url,
    });
    this._enemySprite = new BattlePokemonSprite(this, 610, UI_Y - 184, {
      species:       9,   // Blastoise front sprite
      isBack:        false,
      size:          160,
      tilesetBaseUrl: url,
    });

    // Right-side panel: state label + navigation hint
    const panelX = ACTION_X + 12;

    this._stateLabel = this.add.text(panelX, UI_Y + 12, '', {
      fontFamily: 'Gen3',
      fontSize:   '12px',
      color:      '#e8e8e8',
      wordWrap:   { width: 290 },
    });

    this.add.text(panelX, UI_Y + UI_H - 24, '← → arrow keys to cycle states', {
      fontFamily: 'Gen3',
      fontSize:   '11px',
      color:      '#808080',
    });

    this._stateCounter = this.add.text(800 - 12, UI_Y + UI_H - 24, '', {
      fontFamily: 'Gen3',
      fontSize:   '11px',
      color:      '#808080',
    });
    this._stateCounter.setOrigin(1, 0);
  }

  // ─── Input ───────────────────────────────────────────────────────────────────

  _setupKeys() {
    this.input.keyboard.on('keydown-LEFT',  () => this._cycle(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this._cycle(1));
  }

  _cycle(dir) {
    this._stateIndex = (this._stateIndex + dir + STATES.length) % STATES.length;
    this._applyState(true);
  }

  // ─── State application ───────────────────────────────────────────────────────

  /**
   * Renders all UI components according to the current state entry.
   * @param {boolean} animate - Whether to animate the HP bar transitions.
   */
  _applyState(animate) {
    const s = STATES[this._stateIndex];

    this._updateBackground(s.weather.type);
    this._updatePlatforms(s.weather.type);
    this._weatherDisplay.setWeather(s.weather);
    this._fieldScreens.update(s.screens);

    this._playerBox.remap(s.playerBox);

    this._enemyBox.remap(
      s.enemyTrainer.name,
      s.enemyTeam,
      s.enemyMon,
      s.enemyTrainer.isWild,
    );

    this._logger.showText(s.logText);

    this._stateLabel.setText(`${s.label}`);
    this._stateCounter.setText(`${this._stateIndex + 1} / ${STATES.length}`);
  }
}
