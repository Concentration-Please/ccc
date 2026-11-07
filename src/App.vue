<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import { indigenousRecords } from '@/data/indigenousDataset'
import { fetchAnnouncementBatch, hasSeenBatch, markBatchSeen } from '@/services/announcements'
import { matchesSubscription, toMatchableAid, type Persona } from '@/services/matchSubscription'
import {
  loadNotifiedIds,
  loadSubscription,
  markNotified,
  saveSubscription,
  uniqueNotifications,
} from '@/services/subscription'
import { notifyMatchingAid } from '@/services/townpass'

const POLL_MS = 60_000

const route = useRoute()
const subscription = ref<Persona[]>(loadSubscription())
let pollTimer = 0

function matchingRecords(personas: Persona[]) {
  return indigenousRecords.filter((record) => matchesSubscription(toMatchableAid(record), personas))
}

function pushNewMatches(personas: Persona[]) {
  if (personas.length === 0) return
  const seen = new Set(loadNotifiedIds())
  const pending = matchingRecords(personas)
    .filter((record) => !seen.has(record.source_url))
    .map((record) => ({ url: record.source_url, title: record.name }))
  const fresh = uniqueNotifications(pending)
  for (const item of fresh) notifyMatchingAid(item.title)
  if (pending.length > 0) markNotified(pending.map((item) => item.url))
}

async function notifySubscribedAnnouncements() {
  const personas = subscription.value
  if (personas.length === 0) return
  const batch = await fetchAnnouncementBatch()
  if (!batch.batchId || hasSeenBatch(batch.batchId)) return
  const seen = new Set(loadNotifiedIds())
  const pending = batch.items
    .filter((item) => matchesSubscription(item, personas) && !seen.has(item.id))
    .map((item) => ({ url: item.id, title: item.title }))
  const fresh = uniqueNotifications(pending)
  for (const item of fresh) notifyMatchingAid(item.title)
  if (pending.length > 0) markNotified(pending.map((item) => item.url))
  markBatchSeen(batch.batchId)
}

function saveSubscriptionCriteria(personas: Persona[]) {
  saveSubscription(personas)
  subscription.value = personas
  pushNewMatches(personas)
  void notifySubscribedAnnouncements()
}

provide('ccc-subscription', subscription)
provide('ccc-save-subscription', saveSubscriptionCriteria)

onMounted(() => {
  if (subscription.value.length > 0) pushNewMatches(subscription.value)
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
