<template>
  <div class="min-h-screen bg-gray-950 text-white p-3 sm:p-6">
    <header class="mb-4 sm:mb-6">
      <h1 class="text-xl sm:text-2xl font-bold tracking-wide">Battle Test Harness</h1>
      <p class="text-gray-400 text-sm mt-1">Click a scenario to launch a live battle.</p>
    </header>

    <!-- Tabs -->
    <div class="flex flex-wrap gap-1 mb-4 border-b border-gray-800">
      <div
        v-for="cat in CATEGORIES"
        :key="cat.id"
        class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-t transition cursor-pointer whitespace-nowrap"
        :class="{
          'bg-gray-800 text-white': activeTab === cat.id,
          'text-gray-500 hover:text-gray-300 hover:bg-gray-900': activeTab !== cat.id
        }"
        @click="activeTab = cat.id"
      >
        {{ cat.label }}
      </div>
    </div>

    <!-- Scenario grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <div
        v-for="s in visibleScenarios"
        :key="s.id"
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
    </div>
  </div>

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
        <span class="text-gray-500 text-sm ml-1">— {{ active.scenario.description }}</span>
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
import SCENARIOS, { CATEGORIES } from './scenarios.js';
import MobileControls from '@/components/MobileControls.vue';

// ─── State ────────────────────────────────────────────────────────────────────

const activeTab = ref(CATEGORIES[0].id);
const visibleScenarios = computed(() =>
  SCENARIOS.filter(s => s.category === activeTab.value)
);

const active = ref(null);   // { scenario, gameInstance }
const gameCanvas = ref(null);
let phaserGame = null;

// ─── Hash helpers ─────────────────────────────────────────────────────────────

function scenarioFromHash() {
  const id = location.hash.slice(1);
  return id ? SCENARIOS.find(s => s.id === id) ?? null : null;
}

// ─── Core actions ─────────────────────────────────────────────────────────────

async function launch(scenario) {
  if (phaserGame) {
    phaserGame.destroy(true);
    phaserGame = null;
  }
  active.value = { scenario, gameInstance: null };
  activeTab.value = scenario.category;

  // Sync the URL fragment; no-op if already set (e.g. called from hashchange or onMounted).
  if (location.hash !== '#' + scenario.id) {
    location.hash = scenario.id;
  }

  await nextTick();

  const battleData = scenario.buildData();

  class QuickPreload extends Phaser.Scene {
    constructor() { super({ key: 'QuickPreload' }); }
    create() {
      this.scene.add(BattleScene2.name, BattleScene2, false);
      this.scene.start(BattleScene2.name, battleData);
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
        gameCanvas.value = game.canvas;
      },
    },
  });
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