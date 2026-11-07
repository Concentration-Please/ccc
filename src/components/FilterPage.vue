<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FILTER_GROUPS, type FilterGroup } from '@/services/filter'

const props = defineProps<{
  initialSelectedIds: string[]
}>()

const emit = defineEmits<{
  close: []
  apply: [selectedIds: string[]]
}>()

const selectedIds = ref<string[]>([...props.initialSelectedIds])
const expandedGroups = ref<Record<string, boolean>>(
  Object.fromEntries(FILTER_GROUPS.map((g) => [g.id, true])),
)

watch(
  () => props.initialSelectedIds,
  (ids) => {
    selectedIds.value = [...ids]
  },
)

const hasSelection = computed(() => selectedIds.value.length > 0)

function isSelected(optionId: string) {
  return selectedIds.value.includes(optionId)
}

function toggleOption(optionId: string) {
  if (isSelected(optionId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== optionId)
  } else {
    selectedIds.value = [...selectedIds.value, optionId]
  }
}

function toggleGroup(group: FilterGroup) {
  expandedGroups.value[group.id] = !expandedGroups.value[group.id]
}

function onReset() {
  selectedIds.value = []
}

function onApply() {
  if (!hasSelection.value) return
  emit('apply', [...selectedIds.value])
}

function onClose() {
  emit('close')
}
</script>

<template>
  <div class="filter-page" role="dialog" aria-modal="true" aria-labelledby="filter-page-title">
    <header class="filter-page__header">
      <button type="button" class="filter-page__header-btn" aria-label="返回" @click="onClose">
        <span class="filter-page__chevron" aria-hidden="true" />
      </button>
      <h1 id="filter-page-title" class="filter-page__title">篩選</h1>
      <span aria-hidden="true" />
    </header>

    <div class="filter-page__body">
      <section
        v-for="group in FILTER_GROUPS"
        :key="group.id"
        class="filter-page__section"
      >
        <button
          type="button"
          class="filter-page__section-toggle"
          :aria-expanded="expandedGroups[group.id]"
          @click="toggleGroup(group)"
        >
          <span class="filter-page__section-title">{{ group.title }}</span>
          <span
            class="filter-page__section-chevron"
            :class="{ 'filter-page__section-chevron--collapsed': !expandedGroups[group.id] }"
            aria-hidden="true"
          />
        </button>

        <div v-show="expandedGroups[group.id]" class="filter-page__options">
          <button
            v-for="option in group.options"
            :key="option.id"
            type="button"
            class="filter-page__option"
            :class="{ 'filter-page__option--selected': isSelected(option.id) }"
            @click="toggleOption(option.id)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>
    </div>

    <footer class="filter-page__footer">
      <button type="button" class="filter-page__reset" @click="onReset">重設</button>
      <button
        type="button"
        class="filter-page__submit"
        :class="{ 'filter-page__submit--active': hasSelection }"
        :disabled="!hasSelection"
        @click="onApply"
      >
        搜尋
      </button>
    </footer>
  </div>
</template>

<style scoped>
.filter-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
}

.filter-page__header {
  display: grid;
  grid-template-columns: 3rem 1fr 3rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  padding-top: calc(0.65rem + env(safe-area-inset-top, 0px));
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.filter-page__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
}

.filter-page__header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  padding: 0;
  font: inherit;
  color: var(--color-text);
  background: transparent;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.filter-page__chevron {
  display: block;
  width: 0.55rem;
  height: 0.55rem;
  border-left: 2px solid currentcolor;
  border-bottom: 2px solid currentcolor;
  transform: rotate(45deg);
  margin-left: 0.2rem;
}

.filter-page__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1rem;
  padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
  -webkit-overflow-scrolling: touch;
}

.filter-page__section + .filter-page__section {
  margin-top: 1.5rem;
}

.filter-page__section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  font: inherit;
  color: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

.filter-page__section-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.filter-page__section-chevron {
  display: block;
  width: 0.55rem;
  height: 0.55rem;
  border-right: 2px solid var(--color-text-secondary);
  border-bottom: 2px solid var(--color-text-secondary);
  transform: rotate(-135deg);
  margin-right: 0.35rem;
  transition: transform 0.15s ease;
}

.filter-page__section-chevron--collapsed {
  transform: rotate(45deg);
}

.filter-page__options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
}

.filter-page__option {
  min-height: 3.25rem;
  padding: 0.65rem 0.85rem;
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
  color: var(--color-text);
  background: var(--color-filter-chip-bg);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.filter-page__option--selected {
  color: var(--color-filter-selected-text);
  background: var(--color-accent);
}

.filter-page__option:active {
  opacity: 0.95;
}

.filter-page__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, var(--color-surface) 85%, rgb(255 255 255 / 0));
  box-shadow: 0 -4px 16px rgb(0 0 0 / 6%);
}

.filter-page__reset {
  flex: 0 0 auto;
  min-width: 5.5rem;
  min-height: 3.25rem;
  padding: 0 1.25rem;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: 0.5rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.filter-page__submit {
  flex: 1;
  min-height: 3.25rem;
  padding: 0 1.25rem;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-filter-chip-bg);
  border: none;
  border-radius: 0.5rem;
  cursor: not-allowed;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.filter-page__submit--active {
  color: var(--color-filter-selected-text);
  background: var(--color-accent);
  cursor: pointer;
}

.filter-page__submit--active:active {
  opacity: 0.92;
}
</style>
