import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { auditIndigenousRecords } from './audit.js';
import { extractAttachmentText } from './attachments.js';
import { subsidySchema, type Article, type ArticleListing, type Subsidy, type SubsidyRecord } from './schema.js';
import { createAttachmentFetcher, discoverArticles, normalizeText, parseArticle, parseAttachments, SOURCE_URL, type AttachmentFetcher, type HtmlFetcher } from './source.js';

const cacheEntrySchema = z.object({
  signature: z.string(),
  status: z.enum(['done', 'skipped', 'error']),
  subsidies: z.array(subsidySchema),
  error: z.string().optional(),
});
const cacheSchema = z.object({ version: z.literal(5), entries: z.record(z.string(), cacheEntrySchema) });
type Cache = z.infer<typeof cacheSchema>;

export interface RunOptions {
  fetchHtml: HtmlFetcher;
  fetchAttachment?: AttachmentFetcher;
  extractAttachmentText?: typeof extractAttachmentText;
  extract: (article: Article) => Promise<Subsidy[]>;
  dataDir: string;
  stateDir: string;
  revision: string;
  source?: {
    url: string;
    name: string;
    outputFile: string;
    discover: (fetchHtml: HtmlFetcher) => Promise<ArticleListing[]>;
    parseArticle: typeof parseArticle;
    parseAttachments: typeof parseAttachments;
  };
  log?: (message: string) => void;
}

export interface RunSummary {
  total: number;
  records: number;
  reused: number;
  failures: { url: string; error: string }[];
}

function signature(article: Article, revision: string): string {
  return createHash('sha256').update(JSON.stringify([article.category, article.title, article.publishedAt, article.body, article.attachments, revision])).digest('hex');
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

function toRecords(article: Article, subsidies: Subsidy[], startId: number, isYouth: boolean): SubsidyRecord[] {
  return subsidies.map((subsidy, index) => {
    const isOrganization = subsidy.is_organization || (isYouth && subsidy.conditions.some((condition) =>
      /^(?:申請人|對象|適用對象)(?:須)?為.*?(?:公司、商業|營利事業|人民團體|高級中等學校|大專院校|公私立學校|機構或團體)/.test(condition)));
    return {
      id: startId + index,
      category: article.category,
      label: [],
      is_organization: isOrganization,
      registration_months: isYouth && isOrganization ? null : subsidy.registration_months,
      age_lower: subsidy.age_lower,
      age_upper: subsidy.age_upper,
      isNative: subsidy.isNative,
      source_url: article.url,
      name: subsidy.name,
      summary: subsidy.summary,
      subsidy_target: subsidy.subsidy_target,
      conditions: subsidy.conditions,
      application_method_or_documents: subsidy.application_method_or_documents,
    };
  });
}

export async function runParser(options: RunOptions): Promise<RunSummary> {
  const source = options.source ?? {
    url: SOURCE_URL,
    name: 'ipc',
    outputFile: 'indigenous.json',
    discover: discoverArticles,
    parseArticle,
    parseAttachments,
  };
  await mkdir(options.dataDir, { recursive: true });
  await mkdir(options.stateDir, { recursive: true });
  const cachePath = join(options.stateDir, `${source.name}-parser-state.json`);
  const attachmentDir = join(options.stateDir, `${source.name}-attachments`);
  const attachmentManifestPath = join(options.stateDir, `${source.name}-attachments.json`);
  const outputPath = join(options.dataDir, source.outputFile);
  await Promise.all([
    rm(outputPath, { force: true }),
    rm(join(options.dataDir, 'category.json'), { force: true }),
    rm(cachePath, { force: true }),
    rm(attachmentManifestPath, { force: true }),
    rm(attachmentDir, { recursive: true, force: true }),
  ]);
  await mkdir(attachmentDir, { recursive: true });
  const fetchAttachment = options.fetchAttachment ?? createAttachmentFetcher();
  const readAttachmentText = options.extractAttachmentText ?? extractAttachmentText;
  const cache: Cache = { version: 5, entries: {} };
  const listings = await source.discover(options.fetchHtml);
  const records: SubsidyRecord[] = [];
  const attachments: { article_url: string; url: string; title: string; file: string }[] = [];
  const failures: RunSummary['failures'] = [];
  let reused = 0;

  const appendSubsidies = (article: Article, subsidies: Subsidy[]) => {
    const unique: Subsidy[] = [];
    for (const subsidy of subsidies) {
      if (!unique.some((seen) => isDeepStrictEqual(seen, subsidy))) unique.push(subsidy);
    }
    records.push(...toRecords(article, unique, records.length + 1, source.name === 'youth'));
  };

  const save = async (complete: boolean) => {
    const now = new Date();
    await writeJson(cachePath, cache);
    await writeJson(attachmentManifestPath, attachments);
    await writeJson(outputPath, {
      source: source.url,
      generated_at: now.toISOString(),
      updated_at: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00'),
      complete,
      records,
      errors: failures,
    });
  };

  for (const [index, listing] of listings.entries()) {
    try {
      const html = await options.fetchHtml(listing.url);
      const article = source.parseArticle(html, listing);
      const articleAttachments: NonNullable<Article['attachments']> = [];
      for (const attachment of source.parseAttachments(html, listing.url)) {
        const file = `${createHash('sha256').update(attachment.url).digest('hex')}.${attachment.extension}`;
        const path = join(attachmentDir, file);
        let bytes: Uint8Array;
        try {
          bytes = new Uint8Array(await readFile(path));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          bytes = await fetchAttachment(attachment.url);
          const temporary = `${path}.${randomUUID()}.tmp`;
          await writeFile(temporary, bytes);
          await rename(temporary, path);
        }
        attachments.push({ article_url: article.url, url: attachment.url, title: attachment.title, file: join(`${source.name}-attachments`, file) });
        const text = await readAttachmentText(bytes, attachment.extension);
        if (text) articleAttachments.push({ title: attachment.title, text });
        else options.log?.(`No extractable text in attachment: ${attachment.title} (${attachment.url})`);
      }
      const articleWithAttachments = { ...article, attachments: articleAttachments };
      const hash = signature(articleWithAttachments, options.revision);
      const cached = cache.entries[article.url];
      if (cached?.signature === hash && (cached.status === 'done' || cached.status === 'skipped')) {
        reused += 1;
        if (cached.status === 'done') appendSubsidies(article, cached.subsidies);
      } else if (!article.body && articleAttachments.length === 0) {
        cache.entries[article.url] = { signature: hash, status: 'skipped', subsidies: [] };
      } else {
        const subsidies = await options.extract(articleWithAttachments);
        appendSubsidies(article, subsidies);
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
  if (source.name === 'ipc') {
    for (const issue of auditIndigenousRecords(records)) {
      options.log?.(`Review ${issue.kind}: records ${issue.ids.join(', ')}`);
    }
  }
  return { total: listings.length, records: records.length, reused, failures };
}
