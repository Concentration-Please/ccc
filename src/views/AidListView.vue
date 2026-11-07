<script setup lang="ts">
import { computed, inject, nextTick, onActivated, onMounted, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AidList from '@/components/AidList.vue'
import FilterPage from '@/components/FilterPage.vue'
import SearchFilterBar from '@/components/SearchFilterBar.vue'
import SubscriptionSheet from '@/components/SubscriptionSheet.vue'
import { indigenousRecords } from '@/data/indigenousDataset'
import { fetchAllGovernmentAids, queryGovernmentAids } from '@/services/database'
import { tagsFromSelectedIds, type FilterCriteria } from '@/services/filter'
import type { SubscriptionCriteria } from '@/services/matchSubscription'

defineOptions({ name: 'AidListView' })

function requiredInject<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('subscription provider missing')
  return value
}

const subscription = requiredInject(inject<Ref<SubscriptionCriteria | null>>('ccc-subscription'))
const persistSubscription = requiredInject(
  inject<(criteria: SubscriptionCriteria) => void>('ccc-save-subscription'),
)

const loading = ref(true)
const error = ref<string | null>(null)
const listPage = ref<HTMLElement | null>(null)
const subscriptionOpen = ref(false)
let savedScrollTop = 0

onBeforeRouteLeave(() => {
  savedScrollTop = listPage.value?.scrollTop ?? 0
})

onActivated(async () => {
  await nextTick()
  if (listPage.value) listPage.value.scrollTop = savedScrollTop
})

const searchQuery = ref('')
const appliedFilterIds = ref<string[]>([])
const filterPageOpen = ref(false)

const filterCriteria = computed<FilterCriteria>(() => ({
  searchQuery: searchQuery.value.trim() || undefined,
  selectedOptionIds: appliedFilterIds.value.length ? [...appliedFilterIds.value] : undefined,
}))

const categories = computed(() => [...new Set(indigenousRecords.map((record) => record.category))])

const displayedAids = computed(() => queryGovernmentAids(filterCriteria.value))

const hasActiveFilter = computed(
  () => Boolean(filterCriteria.value.searchQuery) || (filterCriteria.value.selectedOptionIds?.length ?? 0) > 0,
)

const emptyMessage = computed(() =>
  hasActiveFilter.value ? '沒有符合篩選條件的補助' : '沒有補助資料',
)

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

function onSaveSubscription(criteria: SubscriptionCriteria) {
  persistSubscription(criteria)
  subscriptionOpen.value = false
}
</script>

<template>
  <div class="aid-list-view">
    <SearchFilterBar
      v-model:search-query="searchQuery"
      :applied-filters="appliedFilterTags"
      @open-filter="onOpenFilter"
      @open-subscribe="subscriptionOpen = true"
      @remove-filter="onRemoveFilter"
    />
    <div ref="listPage" class="list-page">
      <p v-if="loading" class="status" role="status">載入中…</p>
      <p v-else-if="error" class="status status--error" role="alert">{{ error }}</p>
      <p v-else-if="displayedAids.length === 0" class="status" role="status">{{ emptyMessage }}</p>
      <AidList v-else :aids="displayedAids" />
    </div>
    <FilterPage
      v-if="filterPageOpen"
      :initial-selected-ids="appliedFilterIds"
      @close="onCloseFilterPage"
      @apply="onApplyFilters"
    />
    <SubscriptionSheet
      :open="subscriptionOpen"
      :categories="categories"
      :initial="subscription"
      @close="subscriptionOpen = false"
      @save="onSaveSubscription"
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

.list-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom, 0px);
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
