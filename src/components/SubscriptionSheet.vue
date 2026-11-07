<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import unsubscribeIcon from '@/assets/unsubscribeIcon.svg'
import { FILTER_GROUPS, tagsFromSelectedIds } from '@/services/filter'
import { hasDuplicatePersona, type Persona } from '@/services/matchSubscription'

const props = defineProps<{
  personas: Persona[]
}>()

const emit = defineEmits<{
  close: []
  save: [personas: Persona[]]
}>()

const drafting = ref(false)
const birthDate = ref('')
const identity = ref('')
const categoryIds = ref<string[]>([])
const tagIds = ref<string[]>([])
const expanded = ref<Record<string, boolean>>({})
const pendingUnsubscribeId = ref<string | null>(null)
const duplicateDraft = ref(false)

const identityGroup = computed(() => FILTER_GROUPS.find((group) => group.id === 'is_organization'))
const categoryGroup = computed(() => FILTER_GROUPS.find((group) => group.id === 'category'))
const tagGroups = computed(() =>
  FILTER_GROUPS.filter((group) => group.id === 'registration_months'),
)

function isExpanded(id: string) {
  return expanded.value[id] !== false
}

function toggleSection(id: string) {
  expanded.value = { ...expanded.value, [id]: !isExpanded(id) }
}

function startDraft() {
  birthDate.value = ''
  identity.value = ''
  categoryIds.value = []
  tagIds.value = []
  expanded.value = {}
  duplicateDraft.value = false
  drafting.value = true
}

watch([birthDate, identity, categoryIds, tagIds], () => {
  duplicateDraft.value = false
})

function toggle(selected: string[], id: string): string[] {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return [...next]
}

function selectIdentity(id: string) {
  identity.value = identity.value === id ? '' : id
}

function completeDraft() {
  const criteria = {
    birthDate: birthDate.value,
    identity: identity.value,
    categoryIds: [...categoryIds.value],
    tagIds: [...tagIds.value],
  }
  if (hasDuplicatePersona(props.personas, criteria)) {
    duplicateDraft.value = true
    return
  }
  const persona: Persona = {
    id: crypto.randomUUID(),
    ...criteria,
  }
  duplicateDraft.value = false
  drafting.value = false
  emit('save', [...props.personas, persona])
}

function removePersona(id: string) {
  emit('save', props.personas.filter((persona) => persona.id !== id))
}

function requestUnsubscribe(id: string) {
  pendingUnsubscribeId.value = id
}

function cancelUnsubscribe() {
  pendingUnsubscribeId.value = null
}

function confirmUnsubscribe() {
  const id = pendingUnsubscribeId.value
  if (!id) return
  removePersona(id)
  pendingUnsubscribeId.value = null
}

function personaChips(persona: Persona): string[] {
  const labels = [
    ...(persona.birthDate ? [persona.birthDate] : []),
    ...tagsFromSelectedIds(
      [persona.identity, ...persona.categoryIds, ...persona.tagIds].filter((id) => id !== ''),
    ).map((tag) => tag.label),
  ]
  return labels.length > 0 ? labels : ['全部符合']
}
</script>

<template>
  <div class="subscribe-page" role="dialog" aria-modal="true" aria-labelledby="subscribe-page-title">
    <header class="subscribe-page__header">
      <button type="button" class="subscribe-page__header-btn" aria-label="返回" @click="emit('close')">
        <span class="subscribe-page__chevron" aria-hidden="true" />
      </button>
      <h1 id="subscribe-page-title" class="subscribe-page__title">訂閱</h1>
      <span aria-hidden="true" />
    </header>

    <div class="subscribe-page__body" :class="{ 'subscribe-page__body--draft': drafting }">
      <div v-if="!drafting && personas.length === 0" class="subscribe-page__empty">
        <button type="button" class="plus" aria-label="新增 persona" @click="startDraft">+</button>
      </div>

      <template v-else>
        <ul v-if="!drafting && personas.length > 0" class="personas">
          <li v-for="persona in personas" :key="persona.id" class="persona">
            <div class="persona__row">
              <span v-for="(chip, index) in personaChips(persona)" :key="`${chip}-${index}`" class="subscription-tag">
                {{ chip }}
              </span>
            </div>
            <button
              type="button"
              class="persona__unsubscribe"
              aria-label="取消訂閱"
              @click="requestUnsubscribe(persona.id)"
            >
              <img class="persona__unsubscribe-icon" :src="unsubscribeIcon" alt="" width="24" height="24" />
            </button>
          </li>
        </ul>

        <button v-if="!drafting" type="button" class="plus plus--below" aria-label="新增 persona" @click="startDraft">
          +
        </button>

        <form v-else class="draft" @submit.prevent="completeDraft">
          <section class="draft__section">
            <button
              type="button"
              class="draft__toggle"
              :aria-expanded="isExpanded('birth')"
              @click="toggleSection('birth')"
            >
              <span class="draft__title">出生年月日</span>
              <span
                class="draft__chevron"
                :class="{ 'draft__chevron--collapsed': !isExpanded('birth') }"
                aria-hidden="true"
              />
            </button>
            <input v-show="isExpanded('birth')" v-model="birthDate" class="draft__date" type="date" />
          </section>

          <section v-if="identityGroup" class="draft__section">
            <button
              type="button"
              class="draft__toggle"
              :aria-expanded="isExpanded(identityGroup.id)"
              @click="toggleSection(identityGroup.id)"
            >
              <span class="draft__title">{{ identityGroup.title }}</span>
              <span
                class="draft__chevron"
                :class="{ 'draft__chevron--collapsed': !isExpanded(identityGroup.id) }"
                aria-hidden="true"
              />
            </button>
            <div v-show="isExpanded(identityGroup.id)" class="draft__options">
              <button
                v-for="option in identityGroup.options"
                :key="option.id"
                type="button"
                class="draft__option"
                :class="{ 'draft__option--selected': identity === option.id }"
                @click="selectIdentity(option.id)"
              >
                {{ option.label }}
              </button>
            </div>
          </section>

          <section v-if="categoryGroup" class="draft__section">
            <button
              type="button"
              class="draft__toggle"
              :aria-expanded="isExpanded(categoryGroup.id)"
              @click="toggleSection(categoryGroup.id)"
            >
              <span class="draft__title">{{ categoryGroup.title }}</span>
              <span
                class="draft__chevron"
                :class="{ 'draft__chevron--collapsed': !isExpanded(categoryGroup.id) }"
                aria-hidden="true"
              />
            </button>
            <div v-show="isExpanded(categoryGroup.id)" class="draft__options">
              <button
                v-for="option in categoryGroup.options"
                :key="option.id"
                type="button"
                class="draft__option"
                :class="{ 'draft__option--selected': categoryIds.includes(option.id) }"
                @click="categoryIds = toggle(categoryIds, option.id)"
              >
                {{ option.label }}
              </button>
            </div>
          </section>

          <section v-for="group in tagGroups" :key="group.id" class="draft__section">
            <button
              type="button"
              class="draft__toggle"
              :aria-expanded="isExpanded(group.id)"
              @click="toggleSection(group.id)"
            >
              <span class="draft__title">{{ group.title }}</span>
              <span
                class="draft__chevron"
                :class="{ 'draft__chevron--collapsed': !isExpanded(group.id) }"
                aria-hidden="true"
              />
            </button>
            <div v-show="isExpanded(group.id)" class="draft__options">
              <button
                v-for="option in group.options"
                :key="option.id"
                type="button"
                class="draft__option"
                :class="{ 'draft__option--selected': tagIds.includes(option.id) }"
                @click="tagIds = toggle(tagIds, option.id)"
              >
                {{ option.label }}
              </button>
            </div>
          </section>
        </form>
      </template>
    </div>

    <div
      v-if="pendingUnsubscribeId"
      class="unsubscribe-confirm"
      role="presentation"
      @click.self="cancelUnsubscribe"
    >
      <div
        class="unsubscribe-confirm__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsubscribe-confirm-title"
      >
        <div class="unsubscribe-confirm__icon" aria-hidden="true">!</div>
        <h2 id="unsubscribe-confirm-title" class="unsubscribe-confirm__title">確認取消訂閱？</h2>
        <div class="unsubscribe-confirm__actions">
          <button type="button" class="unsubscribe-confirm__action" @click="cancelUnsubscribe">取消</button>
          <button
            type="button"
            class="unsubscribe-confirm__action unsubscribe-confirm__action--primary"
            @click="confirmUnsubscribe"
          >
            確認
          </button>
        </div>
      </div>
    </div>

    <footer v-if="drafting" class="subscribe-page__footer">
      <p v-if="duplicateDraft" class="subscribe-page__duplicate" role="alert">已有相同條件的訂閱</p>
      <button type="button" class="subscribe-page__cancel" @click="drafting = false">取消</button>
      <button type="button" class="subscribe-page__done" @click="completeDraft">完成</button>
    </footer>
  </div>
</template>

<style scoped>
.subscribe-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: white;
  isolation: isolate;
}

.subscribe-page__header {
  display: grid;
  grid-template-columns: 3rem 1fr 3rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  padding-top: calc(0.65rem + env(safe-area-inset-top, 0px));
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.subscribe-page__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
}

.subscribe-page__header-btn {
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

.subscribe-page__chevron {
  display: block;
  width: 0.55rem;
  height: 0.55rem;
  border-left: 2px solid currentcolor;
  border-bottom: 2px solid currentcolor;
  transform: rotate(45deg);
  margin-left: 0.2rem;
}

.subscribe-page__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1rem;
  -webkit-overflow-scrolling: touch;
}

.subscribe-page__body--draft {
  padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
}

.subscribe-page__empty {
  display: flex;
  justify-content: center;
}

.personas {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.persona {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
}

.persona__row {
  display: flex;
  flex: 1;
  gap: 0.5rem;
  min-width: 0;
  overflow-x: auto;
}

.subscription-tag {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--color-accent);
  background: var(--color-surface);
  border: 1px solid var(--color-accent);
  border-radius: 999px;
}

.persona__unsubscribe {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  font: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.persona__unsubscribe-icon {
  display: block;
}

.unsubscribe-confirm {
  position: absolute;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgb(0 0 0 / 25%);
}

.unsubscribe-confirm__dialog {
  display: flex;
  flex-direction: column;
  width: min(100%, 20rem);
  background: var(--color-surface);
  border-radius: 0.875rem;
  box-shadow: 0 8px 32px rgb(0 0 0 / 12%);
}

.unsubscribe-confirm__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  margin: 1.5rem auto 0.75rem;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: #f5a623;
  border-radius: 999px;
}

.unsubscribe-confirm__title {
  margin: 0;
  padding: 0 1.25rem 1.25rem;
  font-size: 1.125rem;
  font-weight: 700;
  text-align: center;
}

.unsubscribe-confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid var(--color-border);
}

.unsubscribe-confirm__action {
  min-height: 3.25rem;
  padding: 0.75rem 1rem;
  font: inherit;
  font-size: 1rem;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: none;
  border-right: 1px solid var(--color-border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.unsubscribe-confirm__action:last-child {
  border-right: none;
  border-bottom-right-radius: 0.875rem;
}

.unsubscribe-confirm__action:first-child {
  border-bottom-left-radius: 0.875rem;
}

.unsubscribe-confirm__action--primary {
  font-weight: 600;
  color: var(--color-text);
}

.plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  font-size: 2rem;
  line-height: 1;
  color: var(--color-filter-selected-text);
  background: var(--color-accent);
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.plus--below {
  margin: 1.25rem auto 0;
}

.draft__section + .draft__section {
  margin-top: 1.5rem;
}

.draft__toggle {
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

.draft__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.draft__chevron {
  display: block;
  width: 0.55rem;
  height: 0.55rem;
  border-right: 2px solid var(--color-text-secondary);
  border-bottom: 2px solid var(--color-text-secondary);
  transform: rotate(-135deg);
  margin-right: 0.35rem;
  transition: transform 0.15s ease;
}

.draft__chevron--collapsed {
  transform: rotate(45deg);
}

.draft__date {
  width: 100%;
  margin-top: 1rem;
  min-height: 3.25rem;
  padding: 0.65rem 0.85rem;
  font: inherit;
  font-size: 1rem;
  color: var(--color-text);
  background: var(--color-filter-chip-bg);
  border: none;
  border-radius: 0.5rem;
}

.draft__options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
}

.draft__option {
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
}

.draft__option--selected {
  color: var(--color-filter-selected-text);
  background: var(--color-accent);
}

.subscribe-page__duplicate {
  flex: 1 1 100%;
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: center;
  color: #c62828;
}

.subscribe-page__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, var(--color-surface) 85%, rgb(255 255 255 / 0));
  box-shadow: 0 -4px 16px rgb(0 0 0 / 6%);
}

.subscribe-page__cancel {
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
}

.subscribe-page__done {
  flex: 1;
  min-height: 3.25rem;
  padding: 0 1.25rem;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--color-filter-selected-text);
  background: var(--color-accent);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
</style>
