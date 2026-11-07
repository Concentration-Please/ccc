<script setup lang="ts">
import { onUnmounted } from 'vue'
import searchIcon from '@/assets/searchIcon.svg'
import filterIcon from '@/assets/filterIcon.svg'
import { indigenousRecords } from '@/data/indigenousDataset'
import type { AppliedFilterTag } from '@/services/filter'
import { notifyMatchingAid } from '@/services/townpass'

const searchQuery = defineModel<string>('searchQuery', { default: '' })

defineProps<{
  appliedFilters: AppliedFilterTag[]
}>()

const emit = defineEmits<{
  submitSearch: []
  openFilter: []
  openSubscribe: []
  removeFilter: [id: string]
}>()

function onSubmit() {
  emit('submitSearch')
}

// BEGIN TEMPORARY: delete this block. Three quick taps on the search button notify indigenous record 85.
const TEMP_ELIGIBLE_AID_NAME = indigenousRecords.find((record) => record.id === 85)?.name
const TEMP_CLICK_WINDOW_MS = 600
let tempSearchClicks = 0
let tempSearchTimer = 0

function onSearchClick() {
  onSubmit()
  tempSearchClicks += 1
  window.clearTimeout(tempSearchTimer)
  if (tempSearchClicks >= 3) {
    tempSearchClicks = 0
    if (TEMP_ELIGIBLE_AID_NAME) notifyMatchingAid(TEMP_ELIGIBLE_AID_NAME)
    return
  }
  tempSearchTimer = window.setTimeout(() => {
    tempSearchClicks = 0
  }, TEMP_CLICK_WINDOW_MS)
}

onUnmounted(() => {
  window.clearTimeout(tempSearchTimer)
})
// END TEMPORARY

function onOpenFilter() {
  emit('openFilter')
}

function onRemoveFilter(id: string) {
  emit('removeFilter', id)
}
</script>

<template>
  <div class="search-filter-bar">
    <div class="search-filter-bar__row">
      <input
        v-model="searchQuery"
        type="search"
        class="search-filter-bar__input"
        placeholder="搜尋..."
        autocomplete="off"
      />
      <button
        type="button"
        class="search-filter-bar__action"
        aria-label="搜尋"
        @click="onSearchClick"
      >
        <img class="search-filter-bar__icon" :src="searchIcon" alt="" width="24" height="24" />
      </button>
      <button
        type="button"
        class="search-filter-bar__action"
        aria-label="篩選"
        @click="onOpenFilter"
      >
        <img class="search-filter-bar__icon" :src="filterIcon" alt="" width="24" height="24" />
      </button>
      <button
        type="button"
        class="search-filter-bar__action search-filter-bar__action--text"
        @click="emit('openSubscribe')"
      >
        訂閱
      </button>
    </div>

    <ul v-if="appliedFilters.length" class="search-filter-bar__tags" aria-label="已選篩選">
      <li v-for="tag in appliedFilters" :key="tag.id" class="search-filter-bar__tag">
        <span class="search-filter-bar__tag-label">{{ tag.label }}</span>
        <button
          type="button"
          class="search-filter-bar__tag-remove"
          :aria-label="`移除 ${tag.label}`"
          @click="onRemoveFilter(tag.id)"
        >
          <span aria-hidden="true">×</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search-filter-bar {
  /* Fixed px (was 0.75rem / 1rem / 0.5rem at 18px root) — do not scale with system font. */
  padding: 14px 18px 9px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.search-filter-bar__row {
  --search-bar-control-radius: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
}

.search-filter-bar__input {
  flex: 1;
  min-width: 0;
  height: 48px;
  padding: 0 16px;
  font-family: TownPassUI, sans-serif;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.25;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--search-bar-control-radius);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.search-filter-bar__input::placeholder {
  color: var(--color-text-secondary);
}

.search-filter-bar__input:focus {
  border-color: var(--color-accent);
}

.search-filter-bar__action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  background: var(--color-accent);
  border: none;
  border-radius: var(--search-bar-control-radius);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.search-filter-bar__action:active {
  opacity: 0.92;
}

.search-filter-bar__action--text {
  width: auto;
  height: 48px;
  padding: 0 15px;
  color: var(--color-primary-text);
  font-family: TownPassUI, sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

.search-filter-bar__icon {
  display: block;
  width: 24px;
  height: 24px;
  max-width: 24px;
  max-height: 24px;
  flex-shrink: 0;
  pointer-events: none;
}

.search-filter-bar__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  list-style: none;
  margin: 0.75rem 0 0.25rem;
  padding: 0;
}

.search-filter-bar__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-accent);
}

.search-filter-bar__tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--color-text-secondary);
  background: var(--color-filter-chip-bg);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.search-filter-bar__tag-remove:active {
  opacity: 0.85;
}
</style>
