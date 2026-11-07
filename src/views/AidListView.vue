<script setup lang="ts">
import { computed, inject, nextTick, onActivated, onMounted, ref, watch, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AidList from '@/components/AidList.vue'
import FilterPage from '@/components/FilterPage.vue'
import SearchFilterBar from '@/components/SearchFilterBar.vue'
import SubscriptionSheet from '@/components/SubscriptionSheet.vue'
import { fetchAllGovernmentAids, queryGovernmentAids } from '@/services/database'
import { tagsFromSelectedIds, type FilterCriteria } from '@/services/filter'
import type { Persona } from '@/services/matchSubscription'

defineOptions({ name: 'AidListView' })

function requiredInject<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('subscription provider missing')
  return value
}

const subscription = requiredInject(inject<Ref<Persona[]>>('ccc-subscription'))
const persistSubscription = requiredInject(inject<(personas: Persona[]) => void>('ccc-save-subscription'))

const loading = ref(true)
const error = ref<string | null>(null)
const listPage = ref<HTMLElement | null>(null)
const subscriptionOpen = ref(false)
let savedScrollTop = 0
let restoringListScroll = false

onBeforeRouteLeave(() => {
  savedScrollTop = listPage.value?.scrollTop ?? 0
})

onActivated(async () => {
  restoringListScroll = true
  await nextTick()
  const el = listPage.value
  if (el) el.scrollTop = savedScrollTop
  await nextTick()
  restoringListScroll = false
})

async function scrollListToTop() {
  savedScrollTop = 0
  await nextTick()
  await nextTick()
  requestAnimationFrame(() => {
    const el = listPage.value
    if (!el) return
    el.scrollTop = 0
    el.scrollTo(0, 0)
  })
}

const searchQuery = ref('')
const submittedSearchQuery = ref('')
const appliedFilterIds = ref<string[]>([])
const filterPageOpen = ref(false)

watch(searchQuery, (query) => {
  if (!query.trim()) submittedSearchQuery.value = ''
})

const filterCriteria = computed<FilterCriteria>(() => ({
  searchQuery: submittedSearchQuery.value || undefined,
  selectedOptionIds: appliedFilterIds.value.length ? [...appliedFilterIds.value] : undefined,
}))

const displayedAids = computed(() => queryGovernmentAids(filterCriteria.value))

/** Stable snapshot so filter/search changes reset scroll without firing on detail return. */
const filterCriteriaKey = computed(() =>
  JSON.stringify({
    search: filterCriteria.value.searchQuery ?? '',
    ids: [...(filterCriteria.value.selectedOptionIds ?? [])].sort(),
  }),
)

watch(
  filterCriteriaKey,
  (_next, prev) => {
    if (restoringListScroll || prev === undefined) return
    void scrollListToTop()
  },
  { flush: 'post' },
)

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

function onSubmitSearch() {
  submittedSearchQuery.value = searchQuery.value.trim()
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

function onSaveSubscription(personas: Persona[]) {
  persistSubscription(personas)
}
</script>

<template>
  <div class="aid-list-view">
    <SearchFilterBar
      v-model:search-query="searchQuery"
      :applied-filters="appliedFilterTags"
      @submit-search="onSubmitSearch"
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
      v-if="subscriptionOpen"
      :personas="subscription"
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
