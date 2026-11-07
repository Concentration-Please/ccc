<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

defineOptions({ name: 'AidListView' })
import AidList from '@/components/AidList.vue'
import FilterPage from '@/components/FilterPage.vue'
import SearchFilterBar from '@/components/SearchFilterBar.vue'
import { fetchAllGovernmentAids, queryGovernmentAids } from '@/services/database'
import { tagsFromSelectedIds, type FilterCriteria } from '@/services/filter'

const loading = ref(true)
const error = ref<string | null>(null)

const searchQuery = ref('')
const appliedFilterIds = ref<string[]>([])
const filterPageOpen = ref(false)

const filterCriteria = computed<FilterCriteria>(() => ({
  searchQuery: searchQuery.value.trim() || undefined,
  selectedOptionIds: appliedFilterIds.value.length ? [...appliedFilterIds.value] : undefined,
}))

const displayedAids = computed(() => queryGovernmentAids(filterCriteria.value))

const appliedFilterTags = computed(() => tagsFromSelectedIds(appliedFilterIds.value))

onMounted(async () => {
  try {
    await fetchAllGovernmentAids()
  } catch {
    error.value = '無法載入資料'
  } finally {
    loading.value = false
  }
})

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
  <div class="aid-list-view">
    <SearchFilterBar
      v-model:search-query="searchQuery"
      :applied-filters="appliedFilterTags"
      @open-filter="onOpenFilter"
      @remove-filter="onRemoveFilter"
    />
    <div class="aid-list-view__scroll">
      <p v-if="loading" class="status" role="status">載入中…</p>
      <p v-else-if="error" class="status status--error" role="alert">{{ error }}</p>
      <AidList v-else :aids="displayedAids" />
    </div>
    <FilterPage
      v-if="filterPageOpen"
      :initial-selected-ids="appliedFilterIds"
      @close="onCloseFilterPage"
      @apply="onApplyFilters"
    />
  </div>
</template>

<style scoped>
.aid-list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
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
