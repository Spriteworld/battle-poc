<template>
  <div class="flex flex-col overflow-hidden" style="height: 100vh; height: 100dvh;">
    <div class="flex flex-1 min-h-0">
      <div id="game-container" class="flex flex-grow h-full w-full object-contain"></div>
    </div>
    <MobileControls class="lg:hidden" />
  </div>
</template>

<script>
import MobileControls from './components/MobileControls.vue';
import { createGame } from './game.js';

export default {
  name: 'App',
  components: { MobileControls },

  mounted() {
    createGame();
  },
};
</script>
