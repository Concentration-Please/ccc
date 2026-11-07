<script setup lang="ts">
import linkIcon from '@/assets/linkIcon.svg'

defineProps<{
  href: string
}>()
</script>

<template>
  <a
    class="external-link"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
  >
    <img class="external-link__icon" :src="linkIcon" alt="" width="20" height="20" />
    <span class="external-link__label">
      <slot />
    </span>
  </a>
</template>

<style scoped>
.external-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-primary);
  text-decoration: none;
  word-break: break-all;
}

.external-link:hover,
.external-link:focus-visible {
  text-decoration: underline;
}

.external-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

.external-link__icon {
  flex-shrink: 0;
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  pointer-events: none;
}

.external-link__label {
  min-width: 0;
}
</style>
