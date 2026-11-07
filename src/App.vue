<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import { indigenousRecords } from '@/data/indigenousDataset'
import { fetchAnnouncementBatch, hasSeenBatch, markBatchSeen } from '@/services/announcements'
import { matchesSubscription, toMatchableAid, type SubscriptionCriteria } from '@/services/matchSubscription'
import { loadNotifiedIds, loadSubscription, markNotified, saveSubscription } from '@/services/subscription'
import { notifyMatchingAid } from '@/services/townpass'

const POLL_MS = 60_000

const route = useRoute()
const subscription = ref<SubscriptionCriteria | null>(loadSubscription())
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

async function notifySubscribedAnnouncements() {
  const criteria = subscription.value
  if (!criteria) return
  const batch = await fetchAnnouncementBatch()
  if (!batch.batchId || hasSeenBatch(batch.batchId)) return
  const seen = new Set(loadNotifiedIds())
  const fresh = batch.items.filter((item) => matchesSubscription(item, criteria) && !seen.has(item.id))
  for (const item of fresh) notifyMatchingAid(item.title)
  if (fresh.length > 0) markNotified(fresh.map((item) => item.id))
  markBatchSeen(batch.batchId)
}

function saveSubscriptionCriteria(criteria: SubscriptionCriteria) {
  saveSubscription(criteria)
  subscription.value = criteria
  pushNewMatches(criteria)
  void notifySubscribedAnnouncements()
}

provide('ccc-subscription', subscription)
provide('ccc-save-subscription', saveSubscriptionCriteria)

onMounted(() => {
  if (subscription.value) pushNewMatches(subscription.value)
  void notifySubscribedAnnouncements()
  pollTimer = window.setInterval(() => void notifySubscribedAnnouncements(), POLL_MS)
})

onUnmounted(() => {
  window.clearInterval(pollTimer)
})
</script>

<template>
  <div class="app-shell">
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
