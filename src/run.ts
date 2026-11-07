import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { subsidySchema, type Article, type Subsidy, type SubsidyRecord } from './schema.js';
import { createAttachmentFetcher, discoverArticles, normalizeText, parseArticle, parseAttachments, SOURCE_URL, type AttachmentFetcher, type HtmlFetcher } from './source.js';

const cacheEntrySchema = z.object({
  signature: z.string(),
  status: z.enum(['done', 'skipped', 'error']),
  subsidies: z.array(subsidySchema),
  error: z.string().optional(),
});
const cacheSchema = z.object({ version: z.literal(4), entries: z.record(z.string(), cacheEntrySchema) });
type Cache = z.infer<typeof cacheSchema>;

export interface RunOptions {
  fetchHtml: HtmlFetcher;
  fetchAttachment?: AttachmentFetcher;
  extract: (article: Article) => Promise<Subsidy[]>;
  dataDir: string;
  stateDir: string;
  revision: string;
  log?: (message: string) => void;
}

export interface RunSummary {
  total: number;
  records: number;
  reused: number;
  failures: { url: string; error: string }[];
}

function signature(article: Article, revision: string): string {
  return createHash('sha256').update(JSON.stringify([article.category, article.title, article.publishedAt, article.body, revision])).digest('hex');
}

async function loadCache(path: string): Promise<Cache> {
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (value && typeof value === 'object' && 'version' in value && (value.version === 1 || value.version === 2 || value.version === 3)) {
      return { version: 4, entries: {} };
    }
    return cacheSchema.parse(value);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 4, entries: {} };
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

function toRecords(article: Article, subsidies: Subsidy[]): SubsidyRecord[] {
  return subsidies.map((subsidy) => ({
    category: article.category,
    is_organization: subsidy.is_organization,
    registration_months: subsidy.registration_months,
    source_url: article.url,
    name: subsidy.name,
    summary: subsidy.summary,
    subsidy_target: subsidy.subsidy_target,
    conditions: subsidy.conditions,
  }));
}

export async function runParser(options: RunOptions): Promise<RunSummary> {
  await mkdir(options.dataDir, { recursive: true });
  await mkdir(options.stateDir, { recursive: true });
  const cachePath = join(options.stateDir, 'ipc-parser-state.json');
  const attachmentDir = join(options.stateDir, 'ipc-attachments');
  const attachmentManifestPath = join(options.stateDir, 'ipc-attachments.json');
  const outputPath = join(options.dataDir, 'subsidies.json');
  await mkdir(attachmentDir, { recursive: true });
  const fetchAttachment = options.fetchAttachment ?? createAttachmentFetcher();
  const cache = await loadCache(cachePath);
  const listings = await discoverArticles(options.fetchHtml);
  const records: SubsidyRecord[] = [];
  const attachments: { article_url: string; url: string; title: string; file: string }[] = [];
  const failures: RunSummary['failures'] = [];
  let reused = 0;

  const save = async (complete: boolean) => {
    await writeJson(cachePath, cache);
    await writeJson(attachmentManifestPath, attachments);
    await writeJson(outputPath, {
      source: SOURCE_URL,
      generated_at: new Date().toISOString(),
      complete,
      records,
      errors: failures,
    });
  };

  for (const [index, listing] of listings.entries()) {
    try {
      const html = await options.fetchHtml(listing.url);
      const article = parseArticle(html, listing);
      for (const attachment of parseAttachments(html, listing.url)) {
        const file = `${createHash('sha256').update(attachment.url).digest('hex')}.${attachment.extension}`;
        const path = join(attachmentDir, file);
        try {
          await access(path);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          const bytes = await fetchAttachment(attachment.url);
          const temporary = `${path}.${randomUUID()}.tmp`;
          await writeFile(temporary, bytes);
          await rename(temporary, path);
        }
        attachments.push({ article_url: article.url, url: attachment.url, title: attachment.title, file: join('ipc-attachments', file) });
      }
      const hash = signature(article, options.revision);
      const cached = cache.entries[article.url];
      if (cached?.signature === hash && (cached.status === 'done' || cached.status === 'skipped')) {
        reused += 1;
        if (cached.status === 'done') records.push(...toRecords(article, cached.subsidies));
      } else if (!article.body) {
        cache.entries[article.url] = { signature: hash, status: 'skipped', subsidies: [] };
      } else {
        const subsidies = await options.extract(article);
        records.push(...toRecords(article, subsidies));
        cache.entries[article.url] = { signature: hash, status: 'done', subsidies };
      }
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 401 || status === 402 || status === 403) throw error;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ url: listing.url, error: message });
      cache.entries[listing.url] = { signature: '', status: 'error', subsidies: [], error: message };
    }
    await save(false);
    if ((index + 1) % 25 === 0 || index + 1 === listings.length) {
      options.log?.(`Processed ${index + 1}/${listings.length} pages; ${records.length} subsidy records; ${failures.length} errors`);
    }
  }

  await save(failures.length === 0);
  return { total: listings.length, records: records.length, reused, failures };
}
