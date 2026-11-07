<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SubscriptionCriteria } from '@/services/matchSubscription'

const props = defineProps<{
  open: boolean
  categories: string[]
  initial: SubscriptionCriteria | null
}>()

const emit = defineEmits<{
  close: []
  save: [criteria: SubscriptionCriteria]
}>()

const age = ref(0)
const registrationMonths = ref(0)
const isNative = ref(false)
const isOrganization = ref(false)
const selectedCategories = ref<string[]>([])

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const current = props.initial
    age.value = current?.age ?? 0
    registrationMonths.value = current?.registrationMonths ?? 0
    isNative.value = current?.isNative ?? false
    isOrganization.value = current?.isOrganization ?? false
    selectedCategories.value = current ? [...current.categories] : []
  },
)

const canSave = computed(() => age.value >= 0 && registrationMonths.value >= 0)

function toggleCategory(category: string) {
  const next = new Set(selectedCategories.value)
  if (next.has(category)) next.delete(category)
  else next.add(category)
  selectedCategories.value = [...next]
}

function onSubmit() {
  if (!canSave.value) return
  emit('save', {
    age: age.value,
    registrationMonths: registrationMonths.value,
    isNative: isNative.value,
    isOrganization: isOrganization.value,
    categories: selectedCategories.value,
  })
}
</script>

<template>
  <div v-if="open" class="sheet-root">
    <button type="button" class="sheet-backdrop" aria-label="關閉" @click="emit('close')" />
    <form class="sheet" @submit.prevent="onSubmit">
      <h2 class="sheet__title">訂閱條件</h2>

      <label class="field">
        <span>年紀</span>
        <input v-model.number="age" type="number" min="0" inputmode="numeric" required />
      </label>

      <fieldset class="field">
        <legend>類別（不勾選代表不限）</legend>
        <label v-for="category in categories" :key="category" class="check">
          <input
            type="checkbox"
            :checked="selectedCategories.includes(category)"
            @change="toggleCategory(category)"
          />
          {{ category }}
        </label>
      </fieldset>

      <fieldset class="field">
        <legend>是否有原住民身份</legend>
        <label class="check"><input v-model="isNative" type="radio" :value="true" /> 是</label>
        <label class="check"><input v-model="isNative" type="radio" :value="false" /> 否</label>
      </fieldset>

      <fieldset class="field">
        <legend>是否為團體</legend>
        <label class="check"><input v-model="isOrganization" type="radio" :value="true" /> 是</label>
        <label class="check"><input v-model="isOrganization" type="radio" :value="false" /> 否</label>
      </fieldset>

      <label class="field">
        <span>設籍月數</span>
        <input
          v-model.number="registrationMonths"
          type="number"
          min="0"
          inputmode="numeric"
          required
        />
      </label>

      <div class="sheet__actions">
        <button type="button" class="button button--secondary" @click="emit('close')">取消</button>
        <button type="submit" class="button" :disabled="!canSave">儲存訂閱</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.sheet-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgb(0 0 0 / 40%);
}

.sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: 85dvh;
  overflow-y: auto;
  margin: 0;
  padding: 1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
  background: var(--color-surface);
  border-radius: 1rem 1rem 0 0;
}

.sheet__title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0 0 1rem;
  padding: 0;
  border: none;
  font-size: 1rem;
}

.field input[type='number'] {
  font: inherit;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.6rem;
}

.check {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.sheet__actions {
  display: flex;
  gap: 0.75rem;
}

.button {
  flex: 1;
  padding: 0.8rem 1rem;
  font: inherit;
  font-weight: 500;
  color: var(--color-primary-text);
  background: var(--color-primary);
  border: none;
  border-radius: 999px;
}

.button--secondary {
  color: var(--color-text);
  background: var(--color-chip-bg);
}

.button:disabled {
  opacity: 0.5;
}
</style>
