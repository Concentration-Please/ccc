import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { subsidySchema, type Article, type Subsidy, type SubsidyRecord } from './schema.js';
import { discoverArticles, normalizeText, parseArticle, SOURCE_URL, type HtmlFetcher } from './source.js';

const cacheEntrySchema = z.object({
  signature: z.string(),
  status: z.enum(['done', 'skipped', 'error']),
  subsidies: z.array(subsidySchema),
  error: z.string().optional(),
});
const cacheSchema = z.object({ version: z.literal(2), entries: z.record(z.string(), cacheEntrySchema) });
type Cache = z.infer<typeof cacheSchema>;

export interface RunOptions {
  fetchHtml: HtmlFetcher;
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
  return createHash('sha256').update(JSON.stringify([article.title, article.publishedAt, article.body, revision])).digest('hex');
}

async function loadCache(path: string): Promise<Cache> {
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (value && typeof value === 'object' && 'version' in value && value.version === 1) {
      return { version: 2, entries: {} };
    }
    return cacheSchema.parse(value);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 2, entries: {} };
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
    ...subsidy,
    source_url: article.url,
    article_title: article.title,
    published_at: article.publishedAt,
  }));
}

export async function runParser(options: RunOptions): Promise<RunSummary> {
  await mkdir(options.dataDir, { recursive: true });
  await mkdir(options.stateDir, { recursive: true });
  const cachePath = join(options.stateDir, 'ipc-parser-state.json');
  const outputPath = join(options.dataDir, 'subsidies.json');
  const cache = await loadCache(cachePath);
  const listings = await discoverArticles(options.fetchHtml);
  const records: SubsidyRecord[] = [];
  const failures: RunSummary['failures'] = [];
  let reused = 0;

  const save = async (complete: boolean) => {
    await writeJson(cachePath, cache);
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
      const article = parseArticle(await options.fetchHtml(listing.url), listing);
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
