<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchGovernmentAidBySource } from '@/services/database'
import type { GovernmentAidRecord } from '@/types/governmentAid'
import { organizationLabel, registrationLabel } from '@/utils/aidLabels'

const route = useRoute()
const aid = ref<GovernmentAidRecord | null>(null)
const loading = ref(true)
const missing = ref(false)

const sourceUrl = computed(() => {
  const value = route.query.source
  return typeof value === 'string' ? value : ''
})

const aidName = computed(() => {
  const value = route.query.name
  return typeof value === 'string' ? value : ''
})

async function loadAid(source: string, name: string) {
  loading.value = true
  missing.value = false
  aid.value = null

  if (!source) {
    missing.value = true
    loading.value = false
    return
  }

  try {
    const record = await fetchGovernmentAidBySource(source, name || undefined)
    if (!record) {
      missing.value = true
      return
    }
    aid.value = record
  } catch {
    missing.value = true
  } finally {
    loading.value = false
  }
}

watch([sourceUrl, aidName], ([source, name]) => {
  void loadAid(source, name)
}, { immediate: true })
</script>

<template>
  <article class="detail">
    <RouterLink class="detail__back" :to="{ name: 'aid-list' }">返回列表</RouterLink>

    <p v-if="loading" class="detail__status" role="status">載入中…</p>
    <p v-else-if="missing" class="detail__status detail__status--error" role="alert">
      找不到此補助
    </p>

    <template v-else-if="aid">
      <header class="detail__header">
        <h1 class="detail__title">{{ aid.name }}</h1>
        <div class="detail__chips">
          <span class="detail__chip">{{ aid.category }}</span>
          <span class="detail__chip">{{ organizationLabel(aid.is_organization) }}</span>
        </div>
      </header>

      <section class="detail__section">
        <h2>內容概括</h2>
        <p>{{ aid.summary }}</p>
      </section>

      <section class="detail__section">
        <h2>補助標的</h2>
        <p>{{ aid.subsidy_target }}</p>
      </section>

      <section class="detail__section">
        <h2>設籍時間</h2>
        <p>{{ registrationLabel(aid.registration_months) }}</p>
      </section>

      <section class="detail__section">
        <h2>申請條件</h2>
        <ul>
          <li v-for="condition in aid.conditions" :key="condition">{{ condition }}</li>
        </ul>
      </section>

      <p class="detail__source">
        <a :href="aid.source_url" target="_blank" rel="noopener noreferrer">原始公告</a>
      </p>
    </template>
  </article>
</template>

<style scoped>
.detail {
  padding: 1rem 1.1rem 2rem;
}

.detail__back {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--color-primary);
  font-size: 1rem;
  text-decoration: none;
}

.detail__status {
  margin: 2rem 0;
  text-align: center;
  color: var(--color-text-secondary);
}

.detail__status--error {
  color: #c62828;
}

.detail__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.detail__title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.35;
}

.detail__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.detail__chip {
  padding: 0.25rem 0.6rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-chip-text);
  background: var(--color-chip-bg);
  border-radius: 999px;
}

.detail__section {
  margin: 0 0 1.15rem;
  padding: 0.9rem 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
}

.detail__section h2 {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.detail__section p,
.detail__section li {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.5;
}

.detail__section ul {
  margin: 0;
  padding-left: 1.2rem;
}

.detail__section li + li {
  margin-top: 0.45rem;
}

.detail__source {
  margin: 0.5rem 0 0;
}

.detail__source a {
  color: var(--color-primary);
}
</style>
