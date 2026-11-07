<script setup lang="ts">
import type { GovernmentAidRecord } from '@/types/governmentAid'
import { organizationLabel } from '@/utils/aidLabels'

defineProps<{
  aid: GovernmentAidRecord
}>()
</script>

<template>
  <RouterLink
    class="aid-item"
    :to="{ name: 'aid-detail', query: { source: aid.source_url } }"
  >
    <div class="aid-item__row">
      <h2 class="aid-item__title">{{ aid.name }}</h2>
      <span class="aid-item__chip">{{ organizationLabel(aid.is_organization) }}</span>
    </div>
    <p class="aid-item__summary">{{ aid.summary }}</p>
  </RouterLink>
</template>

<style scoped>
.aid-item {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1rem 1.1rem;
  color: inherit;
  text-decoration: none;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
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

.aid-item__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: start;
}

.aid-item__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.35;
}

.aid-item__chip {
  flex-shrink: 0;
  padding: 0.25rem 0.6rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--color-chip-text);
  background: var(--color-chip-bg);
  border-radius: 999px;
  white-space: nowrap;
}

.aid-item__summary {
  margin: 0;
  font-size: 1rem;
  line-height: 1.45;
  color: var(--color-text-secondary);
}
</style>
