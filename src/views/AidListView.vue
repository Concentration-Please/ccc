<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AidList from '@/components/AidList.vue'
import { fetchAllGovernmentAids } from '@/services/database'
import type { GovernmentAidRecord } from '@/types/governmentAid'

const aids = ref<GovernmentAidRecord[]>([])
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
  <p v-if="loading" class="status" role="status">載入中…</p>
  <p v-else-if="error" class="status status--error" role="alert">{{ error }}</p>
  <AidList v-else :aids="aids" />
</template>

<style scoped>
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
