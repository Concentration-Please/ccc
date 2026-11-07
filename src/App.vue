<script setup lang="ts">
import { useRoute } from 'vue-router'
import FilterFab from '@/components/FilterFab.vue'

const route = useRoute()
</script>

<template>
  <div class="app-shell">
    <main class="app-main" :class="{ 'app-main--with-fab': route.name === 'aid-list' }">
      <RouterView />
    </main>
    <FilterFab v-if="route.name === 'aid-list'" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100dvh;
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.app-main--with-fab {
  padding-bottom: calc(var(--fab-reserve) + env(safe-area-inset-bottom, 0px));
}
</style>
