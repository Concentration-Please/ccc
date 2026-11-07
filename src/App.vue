<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AidList from '@/components/AidList.vue'
import FilterPage from '@/components/FilterPage.vue'
import SearchFilterBar from '@/components/SearchFilterBar.vue'
import { fetchAllGovernmentAids } from '@/services/database'
import {
  applyFilter,
  tagsFromSelectedIds,
  type FilterCriteria,
} from '@/services/filter'
import type { GovernmentAid } from '@/types/governmentAid'

const aids = ref<GovernmentAid[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const searchQuery = ref('')
const appliedFilterIds = ref<string[]>([])
const filterPageOpen = ref(false)

const filterCriteria = computed<FilterCriteria>(() => ({
  searchQuery: searchQuery.value.trim() || undefined,
  selectedOptionIds: appliedFilterIds.value.length ? [...appliedFilterIds.value] : undefined,
}))

const displayedAids = computed(() => applyFilter(aids.value, filterCriteria.value))

const appliedFilterTags = computed(() => tagsFromSelectedIds(appliedFilterIds.value))

onMounted(async () => {
  try {
    aids.value = await fetchAllGovernmentAids()
  } catch {
    error.value = '無法載入資料'
  } finally {
    loading.value = false
  }
})

function onSubmitSearch() {
  // Search UI wired; text/query filtering will follow with filter rules.
}

function onOpenFilter() {
  filterPageOpen.value = true
}

function onCloseFilterPage() {
  filterPageOpen.value = false
}

function onApplyFilters(selectedIds: string[]) {
  appliedFilterIds.value = [...selectedIds]
  filterPageOpen.value = false
}

function onRemoveFilter(id: string) {
  appliedFilterIds.value = appliedFilterIds.value.filter((item) => item !== id)
}
</script>

<template>
  <div class="app-shell">
    <SearchFilterBar
      v-model:search-query="searchQuery"
      :applied-filters="appliedFilterTags"
      @submit-search="onSubmitSearch"
      @open-filter="onOpenFilter"
      @remove-filter="onRemoveFilter"
    />
    <main class="app-main">
      <p v-if="loading" class="app-status" role="status">載入中…</p>
      <p v-else-if="error" class="app-status app-status--error" role="alert">{{ error }}</p>
      <AidList v-else :aids="displayedAids" />
    </main>
    <FilterPage
      v-if="filterPageOpen"
      :initial-selected-ids="appliedFilterIds"
      @close="onCloseFilterPage"
      @apply="onApplyFilters"
    />
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
  padding-bottom: env(safe-area-inset-bottom, 0px);
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
