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
  overflow: hidden;
}

.app-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.app-main--list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
