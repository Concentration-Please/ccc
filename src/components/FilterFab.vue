<script setup lang="ts">
import { openFilter } from '@/services/filter'

function onFilterClick() {
  openFilter()
}
</script>

<template>
  <button type="button" class="filter-fab" @click="onFilterClick">篩選條件</button>
</template>

<style scoped>
.filter-fab {
  position: fixed;
  left: 50%;
  bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
  z-index: 10;
  transform: translateX(-50%);
  min-width: 10rem;
  padding: 0.85rem 1.75rem;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--color-primary-text);
  background: var(--color-primary);
  border: none;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgb(0 122 255 / 35%);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.filter-fab:active {
  opacity: 0.92;
}
</style>
