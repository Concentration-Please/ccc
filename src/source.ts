import { load } from 'cheerio';
import type { Article, ArticleListing } from './schema.js';

export const SOURCE_URL = 'https://www.ipc.gov.taipei/Content_List.aspx?n=082798040B8AF70C';
const PAGE_SIZE = 200;
const SOURCE_ORIGIN = 'https://www.ipc.gov.taipei';
// Prefer the complete service page over duplicate amendments and FAQ summaries.
const PREFERRED_ARTICLES = new Map([
  ['B3A1E6E442FFA18B', '796DF3C8A3F35458'],
  ['203B3A62C7BE44F0', '863D1C3D89869AB4'],
  ['F9F03DF617FCAF4E', '863D1C3D89869AB4'],
  ['D023FB4AF2100A7A', '863D1C3D89869AB4'],
  ['35F98F0CC4211482', '863D1C3D89869AB4'],
]);

export type HtmlFetcher = (url: string) => Promise<string>;
export type AttachmentFetcher = (url: string) => Promise<Uint8Array>;

export interface AttachmentLink {
  url: string;
  title: string;
  extension: string;
}

export function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRocDate(value: string): string {
  const match = /^(\d{2,3})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid published date: ${value}`);
  const year = Number(match[1]) + 1911;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid published date: ${value}`);
  }
  return `${year}-${match[2]}-${match[3]}`;
}

function sameSiteUrl(href: string, pageUrl: string): URL | null {
  const url = new URL(href, pageUrl);
  if (url.origin !== SOURCE_ORIGIN) return null;
  url.hash = '';
  return url;
}

interface ServiceLink {
  url: string;
  title: string;
}

export function parseServiceLinks(html: string, pageUrl: string, excludeRootCategories = false): ServiceLink[] {
  const $ = load(html);
  const blocks = $('.list-text.content-list');
  if (!blocks.length) throw new Error(`Cannot find service links at ${pageUrl}`);
  const links: ServiceLink[] = [];
  blocks.each((_, block) => {
    const anchor = $(block).find('.h4 a[href]').first();
    const href = anchor.attr('href');
    const title = normalizeText(anchor.text());
    if (!href || !title) throw new Error(`Invalid service link at ${pageUrl}`);
    if (excludeRootCategories && (title === '為民服務' || title.includes('場地租借') || title.includes('空間借用'))) return;
    const url = sameSiteUrl(href, pageUrl);
    if (url) links.push({ url: url.toString(), title });
  });
  return links;
}

export function parseListing(html: string, pageUrl: string, category: string): { entries: ArticleListing[]; totalCount: number | null; rowCount: number } {
  const $ = load(html);
  const totalText = normalizeText($('.C_Pager .count').first().text());
  const totalMatch = /^\/\s*(\d+)$/.exec(totalText);

  const entries: ArticleListing[] = [];
  let rowCount = 0;
  $('table tr').each((_, row) => {
    const titleCell = $(row).find('td[data-title="標題"], td[data-title="主題"]');
    if (!titleCell.length) return;
    rowCount += 1;
    const anchor = titleCell.find('a[href]').first();
    const href = anchor.attr('href');
    const title = normalizeText(anchor.text());
    if (!href || !title) throw new Error(`Invalid listing row at ${pageUrl}`);
    const url = sameSiteUrl(href, pageUrl);
    if (!url) return;
    if (url.pathname.toLowerCase() !== '/news_content.aspx') {
      throw new Error(`Unexpected article URL: ${url}`);
    }
    const date = normalizeText($(row).find('td[data-title="發布日期"], td[data-title="上版日期"]').text());
    entries.push({ url: url.toString(), title, category, publishedAt: date ? parseRocDate(date) : null });
  });

  const totalCount = totalMatch ? Number(totalMatch[1]) : null;
  if (totalCount !== null && totalCount > 0 && rowCount === 0) throw new Error(`No article rows found at ${pageUrl}`);
  return { entries, totalCount, rowCount };
}

export function parseArticle(html: string, listing: ArticleListing): Article {
  const $ = load(html);
  const isContentPage = new URL(listing.url).pathname.toLowerCase() === '/cp.aspx';
  const bodyNode = $(isContentPage ? '.area-editor.user-edit' : '.area-essay.page-caption-p .essay').first();
  if (!bodyNode.length && $('.list-text.file-download-multiple').length) return { ...listing, body: '' };
  if (!bodyNode.length) throw new Error(`Cannot find article body at ${listing.url}`);
  bodyNode.find('script, style').remove();
  bodyNode.find('br').replaceWith(' ');
  const body = normalizeText(bodyNode.text());
  return { ...listing, body };
}

export function parseAttachments(html: string, pageUrl: string): AttachmentLink[] {
  const $ = load(html);
  const links: AttachmentLink[] = [];
  $('.file-download-multiple a[href], .file-download a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    const url = new URL(href, pageUrl);
    if (url.origin !== 'https://www-ws.gov.taipei') return;
    const extension = (url.searchParams.get('icon') ?? '').match(/([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? 'bin';
    const title = normalizeText($(element).attr('data-title') ?? $(element).attr('title') ?? $(element).text());
    links.push({ url: url.toString(), title, extension });
  });
  return links;
}

export async function discoverArticles(fetchHtml: HtmlFetcher): Promise<ArticleListing[]> {
  const queue = parseServiceLinks(await fetchHtml(SOURCE_URL), SOURCE_URL, true)
    .map((link) => ({ ...link, category: link.title }));
  const visitedSections = new Set([SOURCE_URL]);
  const articles = new Map<string, ArticleListing>();

  for (const section of queue) {
    if (visitedSections.has(section.url)) continue;
    visitedSections.add(section.url);
    const pathname = new URL(section.url).pathname.toLowerCase();
    if (pathname === '/content_list.aspx') {
      queue.push(...parseServiceLinks(await fetchHtml(section.url), section.url)
        .map((link) => ({ ...link, category: section.category })));
    } else if (pathname === '/news.aspx') {
      const firstUrl = new URL(section.url);
      firstUrl.searchParams.set('page', '1');
      firstUrl.searchParams.set('PageSize', String(PAGE_SIZE));
      let page = 1;
      let observed = 0;
      let expectedCount: number | null = null;
      const seenInSection = new Set<string>();
      let current;
      do {
        firstUrl.searchParams.set('page', String(page));
        current = parseListing(await fetchHtml(firstUrl.toString()), firstUrl.toString(), section.category);
        if (page === 1) expectedCount = current.totalCount;
        if (expectedCount !== null && current.totalCount !== null && current.totalCount !== expectedCount) {
          throw new Error(`Listing changed while crawling ${section.url}`);
        }
        if (page > 1 && current.entries.length > 0 && current.entries.every((article) => seenInSection.has(article.url))) {
          throw new Error(`Listing page repeated at ${firstUrl}`);
        }
        observed += current.rowCount;
        for (const article of current.entries) {
          seenInSection.add(article.url);
          if (!articles.has(article.url)) articles.set(article.url, article);
        }
        page += 1;
      } while (expectedCount !== null ? observed < expectedCount : current.rowCount === PAGE_SIZE);
      if (expectedCount !== null && observed !== expectedCount) {
        throw new Error(`Listing count changed at ${section.url}: expected ${expectedCount}, found ${observed}`);
      }
    } else if (pathname === '/cp.aspx' || pathname === '/news_content.aspx') {
      if (!articles.has(section.url)) articles.set(section.url, { ...section, publishedAt: null });
    } else {
      throw new Error(`Unsupported service page: ${section.url}`);
    }
  }
  const discoveredIds = new Set([...articles.keys()].map((url) => new URL(url).searchParams.get('s')));
  for (const url of articles.keys()) {
    const id = new URL(url).searchParams.get('s');
    const replacement = id ? PREFERRED_ARTICLES.get(id) : undefined;
    if (replacement && discoveredIds.has(replacement)) articles.delete(url);
  }
  return [...articles.values()];
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const milliseconds = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(milliseconds) && milliseconds > 0) return Math.min(milliseconds, 60_000);
  }
  return 1000 * 2 ** attempt;
}

const pause = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function createHtmlFetcher(fetchImpl: typeof fetch = fetch): HtmlFetcher {
  let lastRequestAt = 0;
  return async (url: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await pause(Math.max(0, 300 - (Date.now() - lastRequestAt)));
      lastRequestAt = Date.now();
      try {
        const response = await fetchImpl(url, {
          headers: { 'User-Agent': 'taipei-ipc-subsidy-parser/1.0' },
          signal: AbortSignal.timeout(20_000),
        });
        if (response.ok) return response.text();
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          await pause(retryDelay(response, attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      } catch (error) {
        if (attempt === 2 || (error instanceof Error && error.message.startsWith('HTTP '))) throw error;
        await pause(1000 * 2 ** attempt);
      }
    }
    throw new Error(`Failed to fetch ${url}`);
  };
}

export function createAttachmentFetcher(fetchImpl: typeof fetch = fetch): AttachmentFetcher {
  return async (url: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          headers: { 'User-Agent': 'taipei-ipc-subsidy-parser/1.0' },
          signal: AbortSignal.timeout(60_000),
        });
        if (response.ok) return new Uint8Array(await response.arrayBuffer());
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          await pause(retryDelay(response, attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      } catch (error) {
        if (attempt === 2 || (error instanceof Error && error.message.startsWith('HTTP '))) throw error;
        await pause(1000 * 2 ** attempt);
      }
    }
    throw new Error(`Failed to fetch ${url}`);
  };
}
