<script setup lang="ts">
import { nextTick, onActivated, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AidList from '@/components/AidList.vue'
import { fetchAllGovernmentAids } from '@/services/database'
import type { GovernmentAidRecord } from '@/types/governmentAid'

defineOptions({ name: 'AidListView' })

const aids = ref<GovernmentAidRecord[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const listPage = ref<HTMLElement | null>(null)
let savedScrollTop = 0

onBeforeRouteLeave(() => {
  savedScrollTop = listPage.value?.scrollTop ?? 0
})

onActivated(async () => {
  await nextTick()
  if (listPage.value) listPage.value.scrollTop = savedScrollTop
})

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
  <div ref="listPage" class="list-page">
    <p v-if="loading" class="status" role="status">載入中…</p>
    <p v-else-if="error" class="status status--error" role="alert">{{ error }}</p>
    <AidList v-else :aids="aids" />
  </div>
</template>

<style scoped>
.list-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.status {
  margin: 2rem 1.25rem;
  font-size: 1.125rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.status--error {
  color: #c62828;
}
</style>
