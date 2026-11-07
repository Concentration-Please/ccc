<script setup lang="ts">
import groupIcon from '@/assets/groupIcon.svg'
import personIcon from '@/assets/personIcon.svg'
import type { GovernmentAidItem } from '@/types/governmentAid'
import { organizationLabel } from '@/utils/aidLabels'

defineProps<{
  aid: GovernmentAidItem
}>()
</script>

<template>
  <RouterLink
    class="aid-item"
    :to="{ name: 'record-detail', query: { dataset: aid.dataset, id: aid.id } }"
  >
    <h2 class="aid-item__title">
      {{ aid.name }}
      <img
        v-if="aid.is_organization"
        class="aid-item__icon"
        :src="groupIcon"
        :alt="organizationLabel(aid.is_organization)"
        width="24"
        height="24"
      />
    </h2>
    <p class="aid-item__summary">{{ aid.summary }}</p>
  </RouterLink>
</template>

<style scoped>
.aid-item {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1rem var(--aid-inset, 1.1rem);
  color: inherit;
  text-decoration: none;
  background: var(--color-surface);
  -webkit-tap-highlight-color: transparent;
}

.aid-item:hover,
.aid-item:focus-visible {
  background: #f7f8fa;
}

.aid-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.aid-item__title {
  margin: 0;
  font-size: 0.889rem;
  font-weight: 600;
  line-height: 1.375;
}

.aid-item__icon {
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  margin-left: 0.25rem;
  vertical-align: middle;
}

.aid-item__summary {
  margin: 0;
  font-size: 0.889rem;
  font-weight: 400;
  line-height: 1.375;
  color: var(--color-text-secondary);
}
</style>
