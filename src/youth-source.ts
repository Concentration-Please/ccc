import { load } from 'cheerio';
import type { Article, ArticleListing } from './schema.js';
import { normalizeText, type AttachmentLink, type HtmlFetcher } from './source.js';

export const YOUTH_SOURCE_URL = 'https://youth.gov.taipei/services/05eb79e5-46b5-41e5-b1fd-0519d782b04a';

export function parseYouthListing(html: string): ArticleListing[] {
  const $ = load(html);
  const entries: ArticleListing[] = [];
  const seen = new Set<string>();
  $('.page-container ul.normal-list > li').each((_, row) => {
    const anchor = $(row).find('a.title[href]').first();
    const href = anchor.attr('href');
    const title = normalizeText(anchor.text());
    if (!href || !title) throw new Error('Invalid youth service listing row');
    const url = new URL(href, YOUTH_SOURCE_URL);
    if (url.origin !== new URL(YOUTH_SOURCE_URL).origin || !url.pathname.startsWith(`${new URL(YOUTH_SOURCE_URL).pathname}/`)) {
      throw new Error(`Unexpected youth service URL: ${url}`);
    }
    url.hash = '';
    if (seen.has(url.toString())) return;
    seen.add(url.toString());
    const date = normalizeText($(row).find('.info span').first().text());
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid youth service date: ${date}`);
    entries.push({
      url: url.toString(),
      title,
      category: '其他',
      publishedAt: date || null,
    });
  });

  const count = /共\s*\d+\s*頁\s*(\d+)\s*筆/.exec($('.page-container').text());
  if (!count || entries.length !== Number(count[1])) {
    throw new Error(`Youth service listing is incomplete: found ${entries.length}, expected ${count?.[1] ?? 'unknown'}`);
  }
  return entries;
}

export function parseYouthArticle(html: string, listing: ArticleListing): Article {
  const $ = load(html);
  const content = $('article.article .wysiwyg .content').first().clone();
  if (!content.length) throw new Error(`Cannot find youth service body at ${listing.url}`);
  content.find('script, style').remove();
  content.find('br').replaceWith('\n');
  content.find('td, th').append(' | ');
  content.find('p, li, tr, h2, h3, h4').append('\n');
  const body = content.text().split(/\n+/).map(normalizeText).filter(Boolean).join('\n');
  return { ...listing, body };
}

export function parseYouthAttachments(html: string, pageUrl: string): AttachmentLink[] {
  const $ = load(html);
  const attachments: AttachmentLink[] = [];
  $('article.article .wysiwyg .content a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    const url = new URL(href, pageUrl);
    const extension = /\.(pdf|odt|ods|docx)$/i.exec(url.pathname)?.[1]?.toLowerCase();
    if (url.protocol !== 'https:' || !extension) return;
    const title = normalizeText($(element).text());
    attachments.push({ url: url.toString(), title: title || url.pathname.split('/').at(-1) || '附件', extension });
  });
  return attachments;
}

export async function discoverYouthArticles(fetchHtml: HtmlFetcher): Promise<ArticleListing[]> {
  return parseYouthListing(await fetchHtml(YOUTH_SOURCE_URL));
}
