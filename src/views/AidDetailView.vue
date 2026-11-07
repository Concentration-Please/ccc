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

async function loadAid(source: string) {
  loading.value = true
  missing.value = false
  aid.value = null

  if (!source) {
    missing.value = true
    loading.value = false
    return
  }

  try {
    const record = await fetchGovernmentAidBySource(source)
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

watch(sourceUrl, (source) => {
  void loadAid(source)
}, { immediate: true })
</script>

<template>
  <article class="detail">
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
        <a :href="aid.source_url" target="_blank" rel="noopener noreferrer">公告原文</a>
      </p>
    </template>
  </article>
</template>

<style scoped>
.detail {
  --aid-inset: 1.1rem;
  flex: 1;
  min-height: 0;
  padding-bottom: 2rem;
  overflow-y: auto;
  background: #ffffff;
  -webkit-overflow-scrolling: touch;
}

.detail__status {
  margin: 2rem var(--aid-inset);
  text-align: center;
  color: var(--color-text-secondary);
}

.detail__status--error {
  color: #c62828;
}

.detail__header,
.detail__section {
  position: relative;
  padding: 1rem var(--aid-inset);
}

.detail__header::after,
.detail__section:not(:last-of-type)::after {
  content: '';
  position: absolute;
  left: var(--aid-inset);
  right: var(--aid-inset);
  bottom: 0;
  height: 1px;
  background: var(--color-border);
}

.detail__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;
}

.detail__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.detail__chip {
  padding: 0 8px;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #ffffff;
  background: #5ab4c5;
  border-radius: 999px;
}

.detail__section h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
}

.detail__section p,
.detail__section ul {
  margin: 4px 0 0;
}

.detail__section p,
.detail__section li {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.detail__section ul {
  padding-left: 1.2rem;
}

.detail__section li + li {
  margin-top: 4px;
}

.detail__source {
  margin: 0;
  padding: 1rem var(--aid-inset) 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.detail__source a {
  color: var(--color-primary);
}
</style>
