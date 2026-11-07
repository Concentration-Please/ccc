<script setup lang="ts">
import AidListItem from '@/components/AidListItem.vue'
import type { GovernmentAidRecord } from '@/types/governmentAid'

defineProps<{
  aids: GovernmentAidRecord[]
}>()
</script>

<template>
  <ul class="aid-list">
    <li v-for="aid in aids" :key="aid.source_url" class="aid-list__item">
      <AidListItem :aid="aid" />
    </li>
  </ul>
</template>

<style scoped>
.aid-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.aid-list__item {
  margin: 0;
  padding: 0;
}
</style>
