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
const cacheSchema = z.object({ version: z.literal(1), entries: z.record(z.string(), cacheEntrySchema) });
type Cache = z.infer<typeof cacheSchema>;

export interface RunOptions {
  fetchHtml: HtmlFetcher;
  extract: (article: Article) => Promise<Subsidy[]>;
  outputDir: string;
  revision: string;
  log?: (message: string) => void;
}

export interface RunSummary {
  total: number;
  candidates: number;
  records: number;
  reused: number;
  failures: { url: string; error: string }[];
}

function signature(article: Article, revision: string): string {
  return createHash('sha256').update(JSON.stringify([article.title, article.publishedAt, article.body, revision])).digest('hex');
}

async function loadCache(path: string): Promise<Cache> {
  try {
    return cacheSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, entries: {} };
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
  await mkdir(options.outputDir, { recursive: true });
  const cachePath = join(options.outputDir, 'parser-state.json');
  const outputPath = join(options.outputDir, 'subsidies.json');
  const cache = await loadCache(cachePath);
  const listings = await discoverArticles(options.fetchHtml);
  const records: SubsidyRecord[] = [];
  const failures: RunSummary['failures'] = [];
  let candidates = 0;
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
      const match = article.title.includes('疫苗') || article.title.includes('免費') || article.body.includes('疫苗') || article.body.includes('免費');
      if (match) candidates += 1;
      const cached = cache.entries[article.url];
      if (cached?.signature === hash && (cached.status === 'done' || cached.status === 'skipped')) {
        reused += 1;
        if (cached.status === 'done') records.push(...toRecords(article, cached.subsidies));
      } else if (!match) {
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
      options.log?.(`Processed ${index + 1}/${listings.length} articles; ${records.length} subsidy records; ${failures.length} errors`);
    }
  }

  await save(failures.length === 0);
  return { total: listings.length, candidates, records: records.length, reused, failures };
}
