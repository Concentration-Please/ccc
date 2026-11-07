import assert from 'node:assert/strict'
import test from 'node:test'
import { diffAnnouncements, type AnnouncementRecord } from '../src/services/announcementDiff.js'

const current: AnnouncementRecord = {
  id: 'https://example.test/a',
  title: '托育補助',
  summary: '原住民兒童托育補助',
  classification: '托育服務',
  isOrganization: false,
  registrationMonths: null,
  ageLower: null,
  ageUpper: null,
  isNative: true,
  conditions: ['具原住民身分', '設籍本市'],
}

test('establishes a baseline without announcing existing records', () => {
  assert.deepEqual(diffAnnouncements(null, [current]), [])
})

test('announces every record on a source url that was not in the snapshot', () => {
  const added = { ...current, id: 'https://example.test/b', title: '長青補助' }
  const addedAgain = { ...added, title: '同一新網址的另一筆', ageLower: 55 }
  const removed = { ...current, id: 'https://example.test/gone' }
  assert.deepEqual(diffAnnouncements([current, removed], [current, added, addedAgain]), [
    added,
    addedAgain,
  ])
})

test('ignores content changes and extra records on a known source url', () => {
  const other = { ...current, title: '另一筆', ageLower: 55 }
  assert.deepEqual(diffAnnouncements([current], [{ ...current, title: '新名稱' }]), [])
  assert.deepEqual(diffAnnouncements([current], [{ ...current, classification: '長青服務' }]), [])
  assert.deepEqual(diffAnnouncements([current], [{ ...current, ageLower: 55 }]), [])
  assert.deepEqual(
    diffAnnouncements([current], [{ ...current, conditions: [...current.conditions].reverse() }]),
    [],
  )
  assert.deepEqual(diffAnnouncements([current], [current, other]), [])
})
