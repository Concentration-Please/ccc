import dataFile from '../data/indigenous.json'
import {
  diffAnnouncements,
  emptyAnnouncementBatch,
  isAnnouncementRecord,
  type AnnouncementBatch,
  type AnnouncementRecord,
} from '../src/services/announcementDiff.ts'

const SNAPSHOT_KEY = 'snapshot'
const FEED_KEY = 'feed'

interface RawRecord {
  category: string
  is_organization: boolean
  registration_months: number | null
  age_lower?: number | null
  age_upper?: number | null
  isNative?: boolean | null
  source_url: string
  name: string
  summary: string
  conditions?: unknown
}

interface AnnouncementKv {
  get(key: string, type: 'json'): Promise<unknown>
  put(key: string, value: string): Promise<void>
}

interface Env {
  NOTIFY: AnnouncementKv
  ASSETS: { fetch(request: Request): Promise<Response> }
}

function optionalBound(value: number | null | undefined): number | null {
  return typeof value === 'number' ? value : null
}

function toAnnouncement(record: RawRecord): AnnouncementRecord {
  const conditions = Array.isArray(record.conditions)
    ? record.conditions.filter((condition): condition is string => typeof condition === 'string')
    : []
  return {
    id: record.source_url,
    title: record.name,
    summary: record.summary,
    classification: record.category,
    isOrganization: record.is_organization,
    registrationMonths: optionalBound(record.registration_months),
    ageLower: optionalBound(record.age_lower),
    ageUpper: optionalBound(record.age_upper),
    isNative: typeof record.isNative === 'boolean' ? record.isNative : null,
    conditions,
  }
}

function readSnapshot(value: unknown): AnnouncementRecord[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(isAnnouncementRecord)
}

function readBatch(value: unknown): AnnouncementBatch {
  if (!value || typeof value !== 'object') return emptyAnnouncementBatch
  const batch = value as Partial<AnnouncementBatch>
  return {
    batchId: typeof batch.batchId === 'string' ? batch.batchId : null,
    items: Array.isArray(batch.items) ? batch.items.filter(isAnnouncementRecord) : [],
  }
}

const currentRecords = (dataFile as { records: RawRecord[] }).records.map(toAnnouncement)

export async function syncAnnouncements(env: Env): Promise<void> {
  const stored = await env.NOTIFY.get(SNAPSHOT_KEY, 'json')
  const previous = readSnapshot(stored)
  const changes = diffAnnouncements(previous, currentRecords)
  if (previous != null && changes.length > 0) {
    const batch: AnnouncementBatch = { batchId: crypto.randomUUID(), items: changes }
    await env.NOTIFY.put(FEED_KEY, JSON.stringify(batch))
  }
  await env.NOTIFY.put(SNAPSHOT_KEY, JSON.stringify(currentRecords))
}

export default {
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(syncAnnouncements(env))
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/announcements') {
      const feed = readBatch(await env.NOTIFY.get(FEED_KEY, 'json'))
      return Response.json(feed, { headers: { 'cache-control': 'no-store' } })
    }
    return env.ASSETS.fetch(request)
  },
}
