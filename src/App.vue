<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import AnnouncementMarquee from '@/components/AnnouncementMarquee.vue'
import { indigenousRecords } from '@/data/indigenousDataset'
import { fetchAnnouncementBatch, hasSeenBatch, markBatchSeen } from '@/services/announcements'
import { matchesSubscription, toMatchableAid, type SubscriptionCriteria } from '@/services/matchSubscription'
import { loadNotifiedIds, loadSubscription, markNotified, saveSubscription } from '@/services/subscription'
import { notifyMatchingAid } from '@/services/townpass'

const POLL_MS = 60_000

const route = useRoute()
const subscription = ref<SubscriptionCriteria | null>(loadSubscription())
const marqueeTitles = ref<string[]>([])
let pollTimer = 0

function matchingRecords(criteria: SubscriptionCriteria) {
  return indigenousRecords.filter((record) => matchesSubscription(toMatchableAid(record), criteria))
}

function pushNewMatches(criteria: SubscriptionCriteria) {
  const seen = new Set(loadNotifiedIds())
  const fresh = matchingRecords(criteria).filter((record) => !seen.has(record.source_url))
  for (const record of fresh) notifyMatchingAid(record.name)
  if (fresh.length > 0) markNotified(fresh.map((record) => record.source_url))
}

async function refreshMarquee() {
  const criteria = subscription.value
  if (!criteria) {
    marqueeTitles.value = []
    return
  }
  const batch = await fetchAnnouncementBatch()
  if (!batch.batchId || hasSeenBatch(batch.batchId)) return
  markBatchSeen(batch.batchId)
  marqueeTitles.value = batch.items
    .filter((item) => matchesSubscription(item, criteria))
    .map((item) => item.title)
}

function saveSubscriptionCriteria(criteria: SubscriptionCriteria) {
  saveSubscription(criteria)
  subscription.value = criteria
  pushNewMatches(criteria)
  void refreshMarquee()
}

provide('ccc-subscription', subscription)
provide('ccc-save-subscription', saveSubscriptionCriteria)

onMounted(() => {
  if (subscription.value) pushNewMatches(subscription.value)
  void refreshMarquee()
  pollTimer = window.setInterval(() => void refreshMarquee(), POLL_MS)
})

onUnmounted(() => {
  window.clearInterval(pollTimer)
})
</script>

<template>
  <div class="app-shell">
    <AnnouncementMarquee :titles="marqueeTitles" />
    <main
      class="app-main"
      :class="{ 'app-main--list': route.name === 'aid-list' }"
    >
      <RouterView v-slot="{ Component }">
        <KeepAlive include="AidListView">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100dvh;
  overflow: hidden;
}

.app-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.app-main--list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
