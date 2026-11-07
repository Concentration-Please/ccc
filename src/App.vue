<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="app-shell">
    <main
      class="app-main"
      :class="{ 'app-main--list': route.name === 'aid-list' }"
    >
      <RouterView v-slot="{ Component }">
        <KeepAlive include="AidListView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>
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

.app-main--list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-main--list :deep(.aid-list-view__scroll) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
