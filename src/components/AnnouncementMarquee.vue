<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  titles: string[]
}>()

const line = computed(() => props.titles.join('　　'))
</script>

<template>
  <div v-if="titles.length > 0" class="marquee" role="status">
    <p class="marquee__track">
      <span>{{ line }}</span>
      <span aria-hidden="true">{{ line }}</span>
    </p>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  flex: none;
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.marquee__track {
  display: flex;
  width: max-content;
  margin: 0;
  animation: marquee 24s linear infinite;
}

.marquee__track span {
  padding: 0.55rem 2rem;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
}

@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee__track {
    animation: none;
  }

  .marquee__track span[aria-hidden='true'] {
    display: none;
  }
}
</style>
