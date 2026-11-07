<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AidList from '@/components/AidList.vue'
import FilterFab from '@/components/FilterFab.vue'
import { fetchAllGovernmentAids } from '@/services/database'
import type { GovernmentAid } from '@/types/governmentAid'

const aids = ref<GovernmentAid[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    aids.value = await fetchAllGovernmentAids()
  } catch {
    error.value = '無法載入資料'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <p v-if="loading" class="app-status" role="status">載入中…</p>
      <p v-else-if="error" class="app-status app-status--error" role="alert">{{ error }}</p>
      <AidList v-else :aids="aids" />
    </main>
    <FilterFab />
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
  padding-bottom: calc(var(--fab-reserve) + env(safe-area-inset-bottom, 0px));
}

.app-status {
  margin: 2rem 1.25rem;
  font-size: 1.125rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.app-status--error {
  color: #c62828;
}
</style>
