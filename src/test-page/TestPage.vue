<template>
  <div class="min-h-screen bg-gray-950 text-white p-3 sm:p-6">
    <header class="mb-4 sm:mb-6">
      <h1 class="text-xl sm:text-2xl font-bold tracking-wide">Battle Test Harness</h1>
      <p class="text-gray-400 text-sm mt-1">Click a scenario to launch a live battle.</p>
    </header>

    <!-- Scenarios grouped by category -->
    <div class="space-y-6 sm:space-y-8">
      <section v-for="cat in CATEGORIES" :key="cat.id">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">{{ cat.label }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <template v-for="s in byCategory[cat.id]" :key="s.id">
            <div
              v-if="s.disabled !== true"
              class="rounded-xl p-2 text-left transition hover:scale-[1.02] active:scale-100 cursor-pointer"
              :class="s.color"
              @click="launch(s)"
            >
              <div class="font-bold text-base mb-1">{{ s.title }}</div>
              <p class="text-xs text-white/70 leading-snug line-clamp-3">{{ s.description }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="tag in s.tags"
                  :key="tag"
                  class="text-[10px] bg-black/30 rounded px-1.5 py-0.5 font-mono"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>

  <!-- Showdown import modal -->
  <Teleport to="body">
    <div
      v-if="showdownModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      @keydown.esc="showdownModal = false"
    >
      <div class="bg-gray-900 rounded-2xl w-full max-w-5xl flex flex-col gap-4 p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-white">Showdown Team Import</h2>
          <button
            class="text-gray-400 hover:text-white text-xl leading-none"
            @click="showdownModal = false"
          >✕</button>
        </div>

        <p class="text-xs text-gray-400">
          Paste two Showdown team exports below. Use the Export button on
          <span class="font-mono text-gray-300">pokemonshowdown.com/teambuilder</span> to get the format.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-gray-300 uppercase tracking-wide">Your Team</label>
            <textarea
              v-model="playerTeamText"
              class="bg-gray-800 text-gray-100 font-mono text-xs rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows="18"
              placeholder="Paste Showdown export here…"
              spellcheck="false"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-gray-300 uppercase tracking-wide">Opponent's Team</label>
            <textarea
              v-model="enemyTeamText"
              class="bg-gray-800 text-gray-100 font-mono text-xs rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows="18"
              placeholder="Paste Showdown export here…"
              spellcheck="false"
            />
          </div>
        </div>

        <!-- Opponent AI selector -->
        <div class="flex items-center gap-3">
          <label class="text-xs font-semibold text-gray-300 uppercase tracking-wide shrink-0">Opponent AI</label>
          <select
            v-model="selectedAI"
            class="bg-gray-800 text-gray-100 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option v-for="opt in AI_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Error display -->
        <div v-if="showdownErrors.length" class="rounded-lg bg-red-900/50 border border-red-700 p-3 text-xs text-red-300 space-y-1">
          <p v-for="e in showdownErrors" :key="e">⚠ {{ e }}</p>
        </div>

        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition"
            @click="showdownModal = false"
          >Cancel</button>
          <button
            class="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition"
            @click="startShowdownBattle"
          >Start Battle →</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Expanded battle overlay -->
  <Teleport to="body">
    <div
      v-if="active"
      class="fixed inset-0 z-50 flex flex-col bg-gray-950"
    >
      <!-- Header bar -->
      <div class="flex items-center gap-3 px-4 py-2 bg-gray-900 shrink-0">
        <button
          class="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition"
          @click="close"
        >← Back</button>
        <span class="font-semibold text-white">{{ active.scenario.title }}</span>
        <div class="ml-auto flex gap-1">
          <span
            v-for="tag in active.scenario.tags"
            :key="tag"
            class="text-[10px] bg-gray-700 rounded px-1.5 py-0.5 font-mono text-gray-300 p-2"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- Phaser canvas mount point -->
      <div
        id="test-game-container"
        class="flex-1 w-full overflow-hidden"
      />

      <!-- Mobile controls (touch devices) -->
      <MobileControls class="lg:hidden shrink-0" :target="gameCanvas" />

      <!-- Keyboard hint (desktop) -->
      <div class="hidden lg:block shrink-0 px-4 py-1 bg-gray-900 text-xs text-gray-500 text-center">
        Arrow keys / Z to confirm · X to cancel · Esc closes overlay
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import Phaser from 'phaser';
import BattleScene2 from '@Scenes/misc/battle/Scene2.js';
import BattleUI from '@Scenes/misc/battle/UI.js';
import EvolutionScene from '@Scenes/misc/EvolutionScene.js';
import UIShowcaseScene from '@Scenes/misc/battle/UIShowcaseScene.js';
import SCENARIOS, { CATEGORIES, SHOWDOWN_EXAMPLE_PLAYER, SHOWDOWN_EXAMPLE_ENEMY } from './scenarios.js';
import MobileControls from '@/components/MobileControls.vue';

// ─── State ────────────────────────────────────────────────────────────────────

const byCategory = computed(() => {
  const map = {};
  for (const cat of CATEGORIES) map[cat.id] = [];
  for (const s of SCENARIOS) (map[s.category] ??= []).push(s);
  return map;
});

const active = ref(null);   // { scenario, gameInstance }
const gameCanvas = ref(null);
let phaserGame = null;

// Showdown import modal state
const showdownModal    = ref(false);
const pendingScenario  = ref(null);
const playerTeamText   = ref(SHOWDOWN_EXAMPLE_PLAYER);
const enemyTeamText    = ref(SHOWDOWN_EXAMPLE_ENEMY);
const showdownErrors   = ref([]);
const selectedAI       = ref('trainer');

const AI_OPTIONS = [
  { value: 'trainer',    label: 'Trainer      — 30% random' },
  { value: 'gym_leader', label: 'Gym Leader   — 10% random' },
  { value: 'elite_four', label: 'Elite Four   —  0% random' },
  { value: 'gen_1',      label: 'Gen 1        — 50% random (type bug)' },
  { value: 'gen_2',      label: 'Gen 2        — 40% random' },
  { value: 'gen_3',      label: 'Gen 3        — 30% random' },
  { value: 'gen_4',      label: 'Gen 4        — 20% random' },
  { value: 'gen_5',      label: 'Gen 5        — 10% random' },
  { value: 'gen_6',      label: 'Gen 6        —  5% random' },
  { value: 'gen_7',      label: 'Gen 7        —  2% random' },
  { value: 'gen_8',      label: 'Gen 8        —  0% random' },
  { value: 'champions',  label: 'Champions    —  0% random (all Pokémon & moves)' },
];

// ─── Hash helpers ─────────────────────────────────────────────────────────────

function scenarioFromHash() {
  const id = location.hash.slice(1);
  return id ? SCENARIOS.find(s => s.id === id) ?? null : null;
}

// ─── Core actions ─────────────────────────────────────────────────────────────

async function launch(scenario, battleData = null) {
  // Showdown scenarios need team text input before we can build the data.
  if (scenario.type === 'showdown' && battleData === null) {
    pendingScenario.value = scenario;
    showdownErrors.value  = [];
    showdownModal.value   = true;
    return;
  }

  if (phaserGame) {
    phaserGame.destroy(true);
    phaserGame = null;
  }
  active.value = { scenario, gameInstance: null };

  // Sync the URL fragment; no-op if already set (e.g. called from hashchange or onMounted).
  if (location.hash !== '#' + scenario.id) {
    location.hash = scenario.id;
  }

  await nextTick();

  const data = battleData ?? scenario.buildData();
  console.log('Launching scenario', scenario.id, { data });

  class QuickPreload extends Phaser.Scene {
    constructor() { super({ key: 'QuickPreload' }); }
    create() {
      if (scenario.type === 'showcase') {
        this.scene.add(UIShowcaseScene.name, UIShowcaseScene, false);
        this.scene.start(UIShowcaseScene.name, data);
      } else {
        this.scene.add(BattleScene2.name, BattleScene2, false);
        this.scene.add(BattleUI.name, BattleUI, false);
        this.scene.add(EvolutionScene.name, EvolutionScene, false);
        this.scene.start(BattleScene2.name, data);
      }
    }
  }

  phaserGame = new Phaser.Game({
    parent: 'test-game-container',
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    pixelArt: true,
    disableContextMenu: true,
    fps: { target: 30, forceSetTimeOut: true },
    scene: [QuickPreload],
    callbacks: {
      postBoot: (game) => {
        game.canvas.style.width = '100%';
        game.canvas.style.height = '100%';
        game.canvas.style['object-fit'] = 'contain';
        game.canvas.setAttribute('tabindex', '0');
        game.canvas.focus();
        gameCanvas.value = game.canvas;
      },
    },
  });
}

async function startShowdownBattle() {
  showdownErrors.value = [];
  const scenario = pendingScenario.value;

  let battleData;
  try {
    battleData = scenario.buildData(playerTeamText.value, enemyTeamText.value, selectedAI.value);
  } catch (err) {
    showdownErrors.value = [err.message ?? String(err)];
    return;
  }

  const errors = [];
  if (!battleData.player.team.length) errors.push('Player team: no valid Pokémon found. Check species names.');
  if (!battleData.enemy.team.length)  errors.push('Opponent team: no valid Pokémon found. Check species names.');
  if (errors.length) {
    showdownErrors.value = errors;
    return;
  }

  showdownModal.value = false;
  await launch(scenario, battleData);
}

function close() {
  if (phaserGame) {
    phaserGame.destroy(true);
    phaserGame = null;
  }
  active.value = null;
  gameCanvas.value = null;
  // Remove fragment without adding a new history entry.
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onKeyDown(e) {
  if (e.key === 'Escape' && active.value) close();
}

// Handle browser Back/Forward navigation that changes the hash.
function onHashChange() {
  const scenario = scenarioFromHash();
  if (scenario) {
    // Hash changed to a known scenario — open it (avoids re-launching the same one).
    if (active.value?.scenario.id !== scenario.id) launch(scenario);
  } else if (active.value) {
    // Hash cleared (e.g. browser Back) — close the overlay without touching the URL.
    if (phaserGame) { phaserGame.destroy(true); phaserGame = null; }
    active.value = null;
    gameCanvas.value = null;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('hashchange', onHashChange);
  // Restore scenario from URL on page load / refresh.
  const initial = scenarioFromHash();
  if (initial) launch(initial);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('hashchange', onHashChange);
  if (phaserGame) phaserGame.destroy(true);
});
</script>