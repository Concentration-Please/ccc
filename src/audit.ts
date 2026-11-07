import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SubsidyRecord } from './schema.js';

type AuditRecord = Pick<SubsidyRecord, 'id' | 'source_url' | 'name' | 'summary' | 'subsidy_target' | 'is_organization'>;

export interface AuditIssue {
  kind: 'amount_conflict' | 'name_conflict' | 'organization' | 'parent_and_child' | 'same_name';
  ids: number[];
}

export function auditIndigenousRecords(records: AuditRecord[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const byUrl = new Map<string, AuditRecord[]>();
  const byName = new Map<string, AuditRecord[]>();

  for (const record of records) {
    if (/(?:註[：:]|應為)\s*\d[\d,]*元/.test(record.subsidy_target)) {
      issues.push({ kind: 'amount_conflict', ids: [record.id] });
    }
    if (record.name.includes('建購') && record.summary.includes('修繕') && !record.summary.includes('建購')) {
      issues.push({ kind: 'name_conflict', ids: [record.id] });
    }
    if (!record.is_organization && /(?:補助|提供).{0,30}(?:學校|團體|組織).{0,30}(?:辦理|舉辦|推動)/.test(record.summary)) {
      issues.push({ kind: 'organization', ids: [record.id] });
    }
    byUrl.set(record.source_url, [...(byUrl.get(record.source_url) ?? []), record]);
    byName.set(record.name, [...(byName.get(record.name) ?? []), record]);
  }

  for (const group of byUrl.values()) {
    for (const parent of group) {
      const children = group.filter((record) => record.id !== parent.id &&
        ['-', '－', '：', '（'].some((separator) => record.name.startsWith(`${parent.name}${separator}`)));
      if (children.length) issues.push({ kind: 'parent_and_child', ids: [parent.id, ...children.map((child) => child.id)] });
    }
  }
  for (const group of byName.values()) {
    if (new Set(group.map((record) => record.source_url)).size > 1) {
      issues.push({ kind: 'same_name', ids: group.map((record) => record.id) });
    }
  }
  return issues;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const path = resolve('data/indigenous.json');
  const data = JSON.parse(await readFile(path, 'utf8')) as { records: AuditRecord[] };
  const byId = new Map(data.records.map((record) => [record.id, record]));
  for (const issue of auditIndigenousRecords(data.records)) {
    const name = byId.get(issue.ids[0]!)?.name ?? '';
    console.log(`${issue.kind}: records ${issue.ids.join(', ')} — ${name}`);
    if (issue.kind === 'same_name') {
      for (const id of issue.ids) console.log(`  ${id}: ${byId.get(id)?.source_url}`);
    }
  }
}
