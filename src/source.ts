import { load } from 'cheerio';
import type { Article, ArticleListing } from './schema.js';

export const SOURCE_URL = 'https://health.gov.taipei/News.aspx?n=BB5A41BA1E6CA260&sms=72544237BBE4C5F6&page=1&PageSize=200';
const PAGE_SIZE = 200;
const SECTION_ID = 'BB5A41BA1E6CA260';

export type HtmlFetcher = (url: string) => Promise<string>;

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

function articleUrl(href: string, pageUrl: string): string {
  const url = new URL(href, pageUrl);
  if (url.origin !== 'https://health.gov.taipei' || url.pathname.toLowerCase() !== '/news_content.aspx') {
    throw new Error(`Unexpected article URL: ${url}`);
  }
  const id = url.searchParams.get('s');
  if (url.searchParams.get('n') !== SECTION_ID || !id) {
    throw new Error(`Article is outside the news section: ${url}`);
  }
  const canonical = new URL('/News_Content.aspx', url.origin);
  canonical.searchParams.set('n', SECTION_ID);
  canonical.searchParams.set('sms', '72544237BBE4C5F6');
  canonical.searchParams.set('s', id);
  return canonical.toString();
}

export function parseListing(html: string, pageUrl: string): { entries: ArticleListing[]; totalCount: number } {
  const $ = load(html);
  const totalText = normalizeText($('.C_Pager .count').first().text());
  const totalMatch = /^\/\s*(\d+)$/.exec(totalText);
  if (!totalMatch) throw new Error(`Cannot find listing total at ${pageUrl}`);

  const entries: ArticleListing[] = [];
  $('table tr').each((_, row) => {
    const titleCell = $(row).find('td[data-title="標題"]');
    const anchor = titleCell.find('a[href*="News_Content.aspx"]').first();
    if (!anchor.length) return;
    const href = anchor.attr('href');
    const title = normalizeText(anchor.text());
    const date = normalizeText($(row).find('td[data-title="發布日期"]').text());
    if (!href || !title) throw new Error(`Invalid listing row at ${pageUrl}`);
    entries.push({ url: articleUrl(href, pageUrl), title, publishedAt: parseRocDate(date) });
  });

  if (Number(totalMatch[1]) > 0 && entries.length === 0) {
    throw new Error(`No article rows found at ${pageUrl}`);
  }
  return { entries, totalCount: Number(totalMatch[1]) };
}

export function parseArticle(html: string, listing: ArticleListing): Article {
  const $ = load(html);
  const bodyNode = $('.area-essay.page-caption-p .essay').first();
  if (!bodyNode.length) throw new Error(`Cannot find article body at ${listing.url}`);
  bodyNode.find('script, style').remove();
  bodyNode.find('br').replaceWith(' ');
  const body = normalizeText(bodyNode.text());
  if (!body) throw new Error(`Article body is empty at ${listing.url}`);
  return { ...listing, body };
}

export async function discoverArticles(fetchHtml: HtmlFetcher): Promise<ArticleListing[]> {
  const first = parseListing(await fetchHtml(SOURCE_URL), SOURCE_URL);
  const pageCount = Math.ceil(first.totalCount / PAGE_SIZE);
  const all = [...first.entries];
  for (let page = 2; page <= pageCount; page += 1) {
    const url = new URL(SOURCE_URL);
    url.searchParams.set('page', String(page));
    const result = parseListing(await fetchHtml(url.toString()), url.toString());
    if (result.totalCount !== first.totalCount) {
      throw new Error('Listing changed while crawling; rerun to get a consistent set of articles');
    }
    all.push(...result.entries);
  }
  const unique = new Map(all.map((entry) => [entry.url, entry]));
  if (all.length !== first.totalCount || unique.size !== first.totalCount) {
    throw new Error(`Listing expected ${first.totalCount} unique articles, found ${unique.size}`);
  }
  return [...unique.values()];
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
          headers: { 'User-Agent': 'taipei-health-subsidy-parser/1.0' },
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
