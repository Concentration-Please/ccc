<script setup lang="ts">
import AidListItem from '@/components/AidListItem.vue'
import type { GovernmentAidItem } from '@/types/governmentAid'
import { aidRecordKey } from '@/utils/aidLabels'

defineProps<{
  aids: GovernmentAidItem[]
}>()
</script>

<template>
  <ul class="aid-list">
    <li v-for="aid in aids" :key="aidRecordKey(aid)" class="aid-list__item">
      <AidListItem :aid="aid" />
    </li>
  </ul>
</template>

<style scoped>
.aid-list {
  --aid-inset: 1.1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aid-list__item {
  position: relative;
  margin: 0;
  padding: 0;
}

.aid-list__item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: var(--aid-inset);
  right: var(--aid-inset);
  bottom: 0;
  height: 1px;
  background: var(--color-border);
}
</style>
