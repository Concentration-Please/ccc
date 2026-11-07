<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchGovernmentAidById } from '@/services/database'
import type { AidDataset, GovernmentAidRecord } from '@/types/governmentAid'
import ExternalLink from '@/components/ExternalLink.vue'
import { organizationLabel, registrationLabel } from '@/utils/aidLabels'

const route = useRoute()
const aid = ref<GovernmentAidRecord | null>(null)
const loading = ref(true)
const missing = ref(false)

const dataset = computed<AidDataset | null>(() => {
  const value = route.query.dataset
  return value === 'indigenous' || value === 'youth' ? value : null
})

const recordId = computed(() => {
  const value = route.query.id
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
})

async function loadAid(dataset: AidDataset | null, id: number | null) {
  loading.value = true
  missing.value = false
  aid.value = null

  if (!dataset || id === null) {
    missing.value = true
    loading.value = false
    return
  }

  try {
    const record = await fetchGovernmentAidById(dataset, id)
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

watch(
  [dataset, recordId],
  ([dataset, id]) => {
    void loadAid(dataset, id)
  },
  { immediate: true },
)

const referenceUrls = computed(() => {
  if (!aid.value) return []
  const urls = [aid.value.source_url, ...(aid.value.ref_urls ?? [])]
  return [...new Set(urls.filter(Boolean))]
})
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

      <section v-if="aid.application_method_or_documents.length" class="detail__section">
        <h2>申請方式或應備文件</h2>
        <ul>
          <li v-for="item in aid.application_method_or_documents" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section v-if="referenceUrls.length" class="detail__refs" aria-label="外部連結">
        <ul class="detail__refs-list">
          <li v-for="url in referenceUrls" :key="url">
            <ExternalLink :href="url">
              {{ url === aid.source_url ? '公告原文' : '參考連結' }}
            </ExternalLink>
          </li>
        </ul>
      </section>
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
  font-size: 1.333rem;
  font-weight: 600;
  line-height: 1.333;
}

.detail__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.detail__chip {
  padding: 0.25em 0.5em;
  font-size: 0.778rem;
  font-weight: 400;
  line-height: 1.43;
  color: #ffffff;
  background: #5ab4c5;
  border-radius: 999px;
}

.detail__section h2 {
  margin: 0;
  font-size: 0.889rem;
  font-weight: 600;
  line-height: 1.375;
}

.detail__section p,
.detail__section ul {
  margin: 0.25rem 0 0;
}

.detail__section p,
.detail__section li {
  font-size: 0.778rem;
  font-weight: 400;
  line-height: 1.43;
}

.detail__section ul {
  padding-left: 1.2rem;
}

.detail__section li + li {
  margin-top: 0.25rem;
}

.detail__refs {
  margin: 0;
  padding: 1rem var(--aid-inset) 0;
}

.detail__refs-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.778rem;
  font-weight: 400;
  line-height: 1.43;
}

.detail__refs-list li + li {
  margin-top: 0.5rem;
}
</style>
