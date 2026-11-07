<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import importIcon from '@/assets/importIcon.svg'
import { FILTER_GROUPS, type FilterGroup } from '@/services/filter'
import { requestUserInfo } from '@/services/townpass'
import { applyUserInfoFilters } from '@/services/userinfo'

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

const appliedKey = computed(() => [...props.initialSelectedIds].sort().join('\0'))

const draftKey = computed(() => [...selectedIds.value].sort().join('\0'))

/** Apply when there is a selection, or when reset clears a previously applied filter set. */
const canApply = computed(() => draftKey.value !== appliedKey.value)

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

function isSingle(group: FilterGroup) {
  return group.selection === 'single'
}

function singleValue(group: FilterGroup): string {
  return selectedIds.value.find((id) => id.startsWith(`${group.id}:`)) ?? ''
}

function onSingleChange(group: FilterGroup, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const prefix = `${group.id}:`
  const rest = selectedIds.value.filter((id) => !id.startsWith(prefix))
  selectedIds.value = value ? [...rest, value] : rest
}

function toggleGroup(group: FilterGroup) {
  expandedGroups.value[group.id] = !expandedGroups.value[group.id]
}

function onReset() {
  selectedIds.value = []
}

function onApply() {
  if (!canApply.value) return
  emit('apply', [...selectedIds.value])
}

function onClose() {
  emit('close')
}

const consentOpen = ref(false)

function onImportClick() {
  consentOpen.value = true
}

function onDeclineImport() {
  consentOpen.value = false
}

async function onAgreeImport() {
  consentOpen.value = false
  const info = await requestUserInfo()
  if (!info) return
  selectedIds.value = applyUserInfoFilters(selectedIds.value, info)
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
        v-for="(group, index) in FILTER_GROUPS"
        :key="group.id"
        class="filter-page__section"
      >
        <button v-if="index === 0" type="button" class="filter-page__import" @click="onImportClick">
          <img class="filter-page__import-icon" :src="importIcon" alt="" width="24" height="24" />
          匯入用戶資訊
        </button>

        <div v-if="isSingle(group)" class="filter-page__select-row">
          <span :id="`filter-label-${group.id}`" class="filter-page__section-title">{{ group.title }}</span>
          <select
            class="filter-page__select"
            :class="{ 'filter-page__select--selected': singleValue(group) !== '' }"
            :aria-labelledby="`filter-label-${group.id}`"
            :value="singleValue(group)"
            @change="onSingleChange(group, $event)"
          >
            <option value="">不限</option>
            <option v-for="option in group.options" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </div>

        <button
          v-else
          type="button"
          class="filter-page__section-toggle"
          :aria-expanded="expandedGroups[group.id]"
          @click="toggleGroup(group)"
        >
          <span :id="`filter-label-${group.id}`" class="filter-page__section-title">{{ group.title }}</span>
          <span
            class="filter-page__section-chevron"
            :class="{ 'filter-page__section-chevron--collapsed': !expandedGroups[group.id] }"
            aria-hidden="true"
          />
        </button>

        <div v-if="!isSingle(group)" v-show="expandedGroups[group.id]" class="filter-page__options">
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
        :class="{ 'filter-page__submit--active': canApply }"
        :disabled="!canApply"
        @click="onApply"
      >
        搜尋
      </button>
    </footer>

    <div v-if="consentOpen" class="import-consent">
      <div
        class="import-consent__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-consent-text"
      >
        <p id="import-consent-text" class="import-consent__body">
          將您的「原住民身份別、出生年月日」帶入篩選功能。個資使用期間為資料帶入之時起至您停止使用本微服務，授權對象僅限於本服務之系統。
        </p>
        <div class="import-consent__actions">
          <button type="button" class="import-consent__decline" @click="onDeclineImport">不同意</button>
          <button type="button" class="import-consent__agree" @click="onAgreeImport">同意</button>
        </div>
      </div>
    </div>
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

.filter-page__import {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: fit-content;
  min-height: 3.25rem;
  margin: 0 auto 1.5rem;
  padding: 0 1.25rem;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1;
  color: var(--color-accent);
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: 0.5rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.filter-page__import-icon {
  display: block;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.filter-page__section-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.filter-page__select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.filter-page__select {
  flex: 0 0 auto;
  min-width: 6.5rem;
  min-height: 3.25rem;
  margin-left: auto;
  padding: 0.65rem 2rem 0.65rem 0.85rem;
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
  text-align-last: center;
  color: var(--color-text);
  background-color: var(--color-filter-chip-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1.4 1.4 6 6l4.6-4.6' fill='none' stroke='%23636366' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 0.7rem 0.45rem;
  border: none;
  border-radius: 0.5rem;
  appearance: none;
  cursor: pointer;
}

.filter-page__select--selected {
  color: var(--color-filter-selected-text);
  background-color: var(--color-accent);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1.4 1.4 6 6l4.6-4.6' fill='none' stroke='%23ffffff' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E");
}

.filter-page__select option {
  color: var(--color-text);
  background: var(--color-surface);
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.import-consent {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgb(0 0 0 / 40%);
}

.import-consent__card {
  width: min(20rem, 100%);
  overflow: hidden;
  background: #fff;
  border-radius: 1rem;
}

.import-consent__body {
  margin: 0;
  padding: 1.35rem 1.15rem 1.2rem;
  font-size: 1rem;
  line-height: 1.55;
  text-align: center;
  color: #000;
}

.import-consent__actions {
  display: flex;
  border-top: 1px solid #c8c8c8;
}

.import-consent__decline,
.import-consent__agree {
  flex: 1;
  min-height: 3rem;
  padding: 0.75rem 0.5rem;
  font: inherit;
  font-size: 1.05rem;
  background: #fff;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.import-consent__decline {
  color: #000;
}

.import-consent__agree {
  color: #5ab4c5;
  border-left: 1px solid #c8c8c8;
}
</style>
