<script setup lang="ts">
import type { GovernmentAid } from '@/types/governmentAid'
import { formatEffectiveDates } from '@/utils/formatEffectiveDates'

defineProps<{
  aid: GovernmentAid
}>()
</script>

<template>
  <article class="aid-item">
    <div class="aid-item__row aid-item__row--top">
      <h2 class="aid-item__title">{{ aid.title }}</h2>
      <span class="aid-item__chip">{{ aid.classification }}</span>
    </div>
    <div class="aid-item__row aid-item__row--bottom">
      <p class="aid-item__demographic">{{ aid.demographic }}</p>
      <p class="aid-item__dates">
        {{ formatEffectiveDates(aid.effectiveFrom, aid.effectiveTo) }}
      </p>
    </div>
  </article>
</template>

<style scoped>
.aid-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.65rem;
  min-height: clamp(4.75rem, calc((100dvh - var(--fab-reserve)) / 4), 11rem);
  padding: 1rem 1.1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.aid-item__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: start;
}

.aid-item__row--bottom {
  align-items: end;
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

.aid-item__demographic {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.aid-item__dates {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.35;
  text-align: right;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
</style>
