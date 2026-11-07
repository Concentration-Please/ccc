import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { extractSubsidies, MODEL_ID } from '../src/extract.js';
import { runParser } from '../src/run.js';
import { parseArticle, parseAttachments, parseListing, parseServiceLinks, SOURCE_URL } from '../src/source.js';
import type { Article, Subsidy } from '../src/schema.js';

function serviceHtml(links: [string, string][]): string {
  return links.map(([title, href]) => `<div class="list-text content-list"><div class="h4"><a href="${href}">${title}</a></div></div>`).join('');
}

function listingHtml(id: string, title: string): string {
  return `<table><tr><td data-title="標題"><a href="News_Content.aspx?n=TEST&s=${id}">${title}</a></td><td data-title="發布日期">115-11-07</td></tr></table>`;
}

function articleHtml(body: string): string {
  return `<nav>網站導覽</nav><div class="area-essay page-caption-p"><div class="essay"><p>${body}</p></div></div>`;
}

const testArticleUrl = 'https://www.ipc.gov.taipei/News_Content.aspx?n=TEST&s=A';
const subsidy: Subsidy = {
  is_organization: false,
  registration_months: null,
  name: '托育補助',
  summary: '原住民家庭可申請托育補助。',
  subsidy_target: '托育費用補助',
  conditions: ['申請家庭須具原住民身分'],
};

test('reads service links, skips venue rental, and extracts page bodies', () => {
  const html = serviceHtml([
    ['本會場地租借', 'News_Link_pic.aspx?n=VENUE'],
    ['托育服務', 'News.aspx?n=CHILD'],
    ['貸款利息補貼', 'cp.aspx?n=LOAN'],
  ]);
  const links = parseServiceLinks(html, SOURCE_URL, true);
  assert.deepEqual(links.map((link) => link.title), ['托育服務', '貸款利息補貼']);
  const listing = parseListing(listingHtml('A', '托育補助'), links[0]!.url, links[0]!.title);
  assert.equal(listing.entries[0]?.publishedAt, '2026-11-07');
  assert.equal(listing.entries[0]?.category, '托育服務');
  assert.equal(parseArticle(articleHtml('原住民家庭可申請托育補助'), listing.entries[0]!).body, '原住民家庭可申請托育補助');
  assert.equal(parseArticle('<div class="list-text file-download-multiple"><a href="rules.pdf">PDF</a></div>', listing.entries[0]!).body, '');
  assert.equal(parseAttachments('<div class="list-text file-download-multiple"><a data-title="補助要點" href="https://www-ws.gov.taipei/Download.ashx?icon=..pdf">PDF</a></div>', listing.entries[0]!.url)[0]?.title, '補助要點');
  assert.equal(parseArticle('<div class="area-editor user-edit">可申請貸款利息補貼</div>', { ...links[1]!, category: links[1]!.title, publishedAt: null }).body, '可申請貸款利息補貼');
});

test('sends a schema-constrained request through the AI SDK provider', async () => {
  let request: Record<string, unknown> | undefined;
  const openrouter = createOpenRouter({
    apiKey: 'test-key',
    compatibility: 'strict',
    fetch: async (_input, init) => {
      request = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        id: 'chatcmpl-test', object: 'chat.completion', created: 1, model: MODEL_ID,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ subsidies: [subsidy] }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const article: Article = {
    url: testArticleUrl,
    title: '托育補助',
    category: '托育服務',
    publishedAt: '2026-11-07',
    body: '原住民家庭可申請托育補助',
  };
  const result = await extractSubsidies(article, openrouter.chat(MODEL_ID, { provider: { require_parameters: true } }));
  assert.equal(result.length, 1);
  assert.equal(request?.model, MODEL_ID);
  assert.equal((request?.response_format as { type: string }).type, 'json_schema');
});

test('crawls nested service pages, sends every body, and resumes', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ccc-parser-test-'));
  let modelCalls = 0;
  let attachmentCalls = 0;
  const articleCategories = new Map<string, string>();
  const fetchHtml = async (input: string): Promise<string> => {
    const url = new URL(input);
    const section = url.searchParams.get('n');
    if (section === '082798040B8AF70C') return serviceHtml([
      ['本會場地租借', 'News_Link_pic.aspx?n=VENUE'],
      ['托育服務', 'News.aspx?n=CHILD'],
      ['貸款利息補貼', 'cp.aspx?n=LOAN'],
      ['原住民團體', 'cp.aspx?n=GROUP'],
      ['其他補助', 'Content_List.aspx?n=OTHER'],
    ]);
    if (section === 'OTHER') return serviceHtml([['中央補助', 'News.aspx?n=CENTRAL']]);
    if (section === 'CHILD') return listingHtml('A', '托育補助');
    if (section === 'CENTRAL') return listingHtml('B', '其他服務');
    if (section === 'LOAN') return '<div class="area-editor user-edit">可申請貸款利息補貼</div>';
    if (section === 'GROUP') return '<div class="area-editor user-edit"></div>';
    if (url.searchParams.get('s') === 'A') return `${articleHtml('原住民家庭可申請托育補助')}<div class="list-text file-download-multiple"><a data-title="補助要點" href="https://www-ws.gov.taipei/Download.ashx?icon=..pdf">PDF</a></div>`;
    if (url.searchParams.get('s') === 'B') return articleHtml('一般政策說明');
    throw new Error(`Unexpected test URL: ${input}`);
  };
  const extract = async (article: Article): Promise<Subsidy[]> => {
    modelCalls += 1;
    articleCategories.set(article.title, article.category);
    return article.body.includes('托育補助') ? [subsidy] : [];
  };

  try {
    const fetchAttachment = async (): Promise<Uint8Array> => {
      attachmentCalls += 1;
      return new TextEncoder().encode('%PDF-test');
    };
    const options = { fetchHtml, fetchAttachment, extract, dataDir: join(rootDir, 'data'), stateDir: join(rootDir, 'tmp'), revision: 'test-ipc' };
    const first = await runParser(options);
    assert.equal(first.total, 4);
    assert.equal(first.records, 1);
    assert.equal(first.failures.length, 0);
    assert.equal(modelCalls, 3);
    assert.equal(attachmentCalls, 1);
    assert.equal(articleCategories.get('其他服務'), '其他補助');

    const second = await runParser(options);
    assert.equal(second.reused, 4);
    assert.equal(modelCalls, 3);
    assert.equal(attachmentCalls, 1);

    const output = JSON.parse(await readFile(join(rootDir, 'data', 'subsidies.json'), 'utf8'));
    assert.equal(output.source, SOURCE_URL);
    assert.match(output.updated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+08:00$/);
    assert.equal(Date.parse(output.updated_at), Date.parse(output.generated_at));
    assert.equal(output.complete, true);
    assert.equal(output.records.length, 1);
    assert.deepEqual(output.records[0], {
      ...subsidy,
      category: '托育服務',
      source_url: testArticleUrl,
    });
    const attachments = JSON.parse(await readFile(join(rootDir, 'tmp', 'ipc-attachments.json'), 'utf8'));
    assert.equal(attachments.length, 1);
    assert.equal((await readFile(join(rootDir, 'tmp', attachments[0].file))).toString(), '%PDF-test');
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
