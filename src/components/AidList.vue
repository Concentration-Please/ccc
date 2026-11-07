<script setup lang="ts">
import AidListItem from '@/components/AidListItem.vue'
import type { GovernmentAid } from '@/types/governmentAid'

defineProps<{
  aids: GovernmentAid[]
}>()
</script>

<template>
  <ul class="aid-list">
    <li v-for="aid in aids" :key="aid.id" class="aid-list__item">
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
