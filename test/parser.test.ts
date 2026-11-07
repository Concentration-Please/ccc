import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import JSZip from 'jszip';
import { extractAttachmentText } from '../src/attachments.js';
import { extractSubsidies, MODEL_ID } from '../src/extract.js';
import { runParser } from '../src/run.js';
import { parseArticle, parseAttachments, parseListing, parseServiceLinks, SOURCE_URL } from '../src/source.js';
import { discoverYouthArticles, parseYouthArticle, parseYouthAttachments, parseYouthListing, YOUTH_SOURCE_URL } from '../src/youth-source.js';
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
  age_lower: null,
  age_upper: null,
  isNative: true,
  name: '托育補助',
  summary: '原住民家庭可申請托育補助。',
  subsidy_target: '托育費用補助',
  conditions: ['申請家庭須具原住民身分'],
  application_method_or_documents: [],
};

test('reads service links, skips excluded categories, and extracts page bodies', () => {
  const html = serviceHtml([
    ['本會場地租借', 'News_Link_pic.aspx?n=VENUE'],
    ['空間借用', 'News.aspx?n=SPACE'],
    ['為民服務', 'News.aspx?n=SERVICE'],
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
  const agedSubsidy: Subsidy = {
    ...subsidy,
    name: '長者補助',
    summary: '符合年齡條件的原住民長者可申請補助。',
    subsidy_target: '長者費用補助',
    conditions: ['申請人須具原住民身分', '申請人年滿55歲、未滿65歲'],
    application_method_or_documents: ['向區公所提出申請', '檢附身分證明文件'],
    age_lower: 55,
    age_upper: 65,
  };
  const youthSubsidy = { ...agedSubsidy, category: '其他' as const };
  const openrouter = createOpenRouter({
    apiKey: 'test-key',
    compatibility: 'strict',
    fetch: async (_input, init) => {
      request = JSON.parse(String(init?.body));
      const isYouth = JSON.stringify(request?.messages).includes('政策性貸款');
      return new Response(JSON.stringify({
        id: 'chatcmpl-test', object: 'chat.completion', created: 1, model: MODEL_ID,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ subsidies: [isYouth ? youthSubsidy : agedSubsidy] }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const article: Article = {
    url: testArticleUrl,
    title: '長者補助',
    category: '長青服務',
    publishedAt: '2026-11-07',
    body: '具原住民身分且年滿55歲、未滿65歲者可申請。',
    attachments: [{ title: '補助要點', text: '應備文件：戶籍謄本' }],
  };
  const result = await extractSubsidies(article, openrouter.chat(MODEL_ID, { provider: { require_parameters: true } }));
  assert.deepEqual(result, [agedSubsidy]);
  assert.equal(request?.model, MODEL_ID);
  assert.equal((request?.response_format as { type: string }).type, 'json_schema');
  assert.match(JSON.stringify(request?.messages), /application_method_or_documents/);
  assert.match(JSON.stringify(request?.messages), /應備文件：戶籍謄本/);
  assert.deepEqual(await extractSubsidies(article, openrouter.chat(MODEL_ID, { provider: { require_parameters: true } }), 'youth'), [youthSubsidy]);
  assert.match(JSON.stringify(request?.messages), /政策性貸款/);
  assert.match(JSON.stringify(request?.messages), /利息補貼須另輸出一筆/);
});

test('reads OpenDocument attachment text and parses an attachment-only article', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ccc-attachment-parser-test-'));
  const zip = new JSZip();
  zip.file('content.xml', '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><text:p>申請方式：向區公所送件</text:p><text:p>應備文件：戶籍謄本</text:p></office:body></office:document-content>');
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  assert.equal(await extractAttachmentText(bytes, 'odt'), '申請方式：向區公所送件\n應備文件：戶籍謄本');
  try {
    const result = await runParser({
      fetchHtml: async () => '<div class="list-text file-download-multiple"></div>',
      fetchAttachment: async () => bytes,
      extract: async (article) => {
        assert.equal(article.body, '');
        assert.deepEqual(article.attachments, [{ title: '申請須知', text: '申請方式：向區公所送件\n應備文件：戶籍謄本' }]);
        return [subsidy];
      },
      dataDir: join(rootDir, 'data'),
      stateDir: join(rootDir, 'tmp'),
      revision: 'test-attachment',
      source: {
        url: SOURCE_URL,
        name: 'attachment-test',
        outputFile: 'attachment-test.json',
        discover: async () => [{ url: testArticleUrl, title: '申請須知', category: '托育服務', publishedAt: null }],
        parseArticle: (_html, listing) => ({ ...listing, body: '' }),
        parseAttachments: () => [{ url: 'https://www-ws.gov.taipei/Download.ashx?icon=..odt', title: '申請須知', extension: 'odt' }],
      },
    });
    assert.equal(result.records, 1);
    const output = JSON.parse(await readFile(join(rootDir, 'data', 'attachment-test.json'), 'utf8'));
    assert.equal(output.complete, true);
    assert.equal(output.records.length, 1);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('skips identical model records within and across articles', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ccc-dedup-parser-test-'));
  const secondUrl = `${SOURCE_URL}&article=second`;
  const { conditions, ...otherFields } = subsidy;
  const sameFieldsInDifferentOrder = { conditions: [...conditions], ...otherFields };
  const distinctConditions = { ...subsidy, conditions: ['申請家庭須設籍臺北市'] };
  const distinctTarget = { ...subsidy, subsidy_target: '另一項托育費用補助' };
  try {
    const result = await runParser({
      fetchHtml: async () => '',
      extract: async (article) => article.url === testArticleUrl
        ? [subsidy, sameFieldsInDifferentOrder, distinctConditions]
        : [{ ...subsidy }, distinctTarget],
      dataDir: join(rootDir, 'data'),
      stateDir: join(rootDir, 'tmp'),
      revision: 'test-dedup',
      source: {
        url: SOURCE_URL,
        name: 'dedup-test',
        outputFile: 'dedup-test.json',
        discover: async () => [
          { url: testArticleUrl, title: '托育補助', category: '托育服務', publishedAt: null },
          { url: secondUrl, title: '另一篇托育補助', category: '托育服務', publishedAt: null },
        ],
        parseArticle: (_html, listing) => ({ ...listing, body: '原住民家庭可申請托育補助。' }),
        parseAttachments: () => [],
      },
    });
    assert.equal(result.total, 2);
    assert.equal(result.records, 3);
    const output = JSON.parse(await readFile(join(rootDir, 'data', 'dedup-test.json'), 'utf8'));
    assert.deepEqual(output.records.map(({ id }: { id: number }) => id), [1, 2, 3]);
    assert.deepEqual(output.records.map(({ source_url }: { source_url: string }) => source_url), [testArticleUrl, testArticleUrl, secondUrl]);
    assert.deepEqual(output.records.map(({ subsidy_target }: { subsidy_target: string }) => subsidy_target), [subsidy.subsidy_target, subsidy.subsidy_target, distinctTarget.subsidy_target]);
    assert.deepEqual(output.records[1].conditions, distinctConditions.conditions);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('rechecks an empty youth extraction and excludes organization representatives from age bounds', async () => {
  let calls = 0;
  const organization = { ...subsidy, is_organization: true, age_lower: 18, age_upper: 45, category: '其他' as const };
  const openrouter = createOpenRouter({
    apiKey: 'test-key',
    compatibility: 'strict',
    fetch: async () => {
      calls += 1;
      return new Response(JSON.stringify({
        id: 'chatcmpl-test', object: 'chat.completion', created: 1, model: MODEL_ID,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ subsidies: calls === 1 ? [] : [organization] }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const article: Article = {
    url: `${YOUTH_SOURCE_URL}/organization`,
    title: '活動補助',
    category: '其他',
    publishedAt: null,
    body: '團體可申請活動補助，代表人須年滿18歲。',
  };
  const result = await extractSubsidies(article, openrouter.chat(MODEL_ID, { provider: { require_parameters: true } }), 'youth');
  assert.equal(calls, 2);
  assert.deepEqual(result, [{ ...organization, age_lower: null, age_upper: null }]);
});

test('rechecks an empty indigenous extraction when the page describes an application', async () => {
  let calls = 0;
  const openrouter = createOpenRouter({
    apiKey: 'test-key',
    compatibility: 'strict',
    fetch: async () => {
      calls += 1;
      return new Response(JSON.stringify({
        id: 'chatcmpl-test', object: 'chat.completion', created: 1, model: MODEL_ID,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ subsidies: calls === 1 ? [] : [subsidy] }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const article: Article = {
    url: testArticleUrl,
    title: '托育補助',
    category: '托育服務',
    publishedAt: null,
    body: '原住民家庭可申請托育補助。',
  };
  const result = await extractSubsidies(article, openrouter.chat(MODEL_ID, { provider: { require_parameters: true } }));
  assert.equal(calls, 2);
  assert.deepEqual(result, [subsidy]);
});

test('reads youth subsidy pages and writes a separate output with shared categories', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ccc-youth-parser-test-'));
  const loanUrl = `${YOUTH_SOURCE_URL}/loan`;
  const otherUrl = `${YOUTH_SOURCE_URL}/other`;
  const listingHtml = `<div class="page-container"><ul class="normal-list">
    <li><a class="title" href="${loanUrl}">青年留學貸款</a><div class="info"><span>2026-08-20</span></div></li>
    <li><a class="title" href="${otherUrl}">青年AI工具補助計畫</a><div class="info"><span>2026-09-22</span></div></li>
    </ul><div>共 1 頁 2 筆</div></div>`;
  const loanHtml = '<article class="article"><div class="wysiwyg"><div class="content"><p>青年留學貸款</p><p>貸款利息補貼</p></div></div></article>';
  const otherHtml = '<article class="article"><div class="wysiwyg"><div class="content"><p>完成AI課程者可申請工具訂閱補助。</p></div></div></article>';
  let currentListingHtml = listingHtml;
  let extractCalls = 0;
  const fetchHtml = async (url: string): Promise<string> => {
    if (url === YOUTH_SOURCE_URL) return currentListingHtml;
    if (url === loanUrl) return loanHtml;
    if (url === otherUrl) return otherHtml;
    throw new Error(`Unexpected URL: ${url}`);
  };
  const listings = parseYouthListing(listingHtml);
  assert.deepEqual(listings.map(({ category }) => category), ['其他', '其他']);
  assert.equal(parseYouthArticle(loanHtml, listings[0]!).body, '青年留學貸款\n貸款利息補貼');
  assert.deepEqual(parseYouthAttachments('<article class="article"><div class="wysiwyg"><div class="content"><a href="https://www.fubon.com/forms/application.pdf">申請書</a><a href="https://example.com/details">詳情</a></div></div></article>', loanUrl), [
    { url: 'https://www.fubon.com/forms/application.pdf', title: '申請書', extension: 'pdf' },
  ]);
  assert.throws(() => parseYouthListing(listingHtml.replace('2 筆', '3 筆')), /incomplete/);

  try {
    const options = {
      fetchHtml,
      extract: async (article: Article) => {
        extractCalls += 1;
        const record = {
          ...subsidy,
          isNative: false,
          conditions: article.title.includes('貸款') ? ['申請人為依法完成登記之公司、商業或有限合夥'] : [],
          category: article.title.includes('貸款') ? '貸款利息補貼' as const : '其他' as const,
        };
        return article.title.includes('貸款') ? [record, { ...record, subsidy_target: '另一貸款額度' }] : [record];
      },
      dataDir: join(rootDir, 'data'),
      stateDir: join(rootDir, 'tmp'),
      revision: 'test-youth',
      source: {
        url: YOUTH_SOURCE_URL,
        name: 'youth',
        outputFile: 'youth.json',
        discover: discoverYouthArticles,
        parseArticle: parseYouthArticle,
        parseAttachments: () => [],
      },
    };
    const result = await runParser(options);
    assert.equal(result.total, 2);
    assert.equal(result.records, 3);
    assert.equal(extractCalls, 2);
    const output = JSON.parse(await readFile(join(rootDir, 'data', 'youth.json'), 'utf8'));
    assert.equal(output.source, YOUTH_SOURCE_URL);
    assert.deepEqual(output.records.map(({ category }: { category: string }) => category), ['貸款利息補貼', '貸款利息補貼', '其他']);
    assert.deepEqual(output.records.map(({ source_url }: { source_url: string }) => source_url), [loanUrl, loanUrl, otherUrl]);
    assert.deepEqual(output.records.map(({ application_method_or_documents }: { application_method_or_documents: string[] }) => application_method_or_documents), [[], [], []]);
    const ids = output.records.map(({ id }: { id: number }) => id);
    assert.deepEqual(ids, [1, 2, 3]);
    currentListingHtml = listingHtml.replace(/<li><a class="title" href="[^"]+\/other".*?<\/li>/, '').replace('2 筆', '1 筆');
    const second = await runParser(options);
    assert.equal(second.reused, 0);
    assert.equal(extractCalls, 3);
    const updated = JSON.parse(await readFile(join(rootDir, 'data', 'youth.json'), 'utf8'));
    assert.deepEqual(updated.records.map(({ id }: { id: number }) => id), [1, 2]);
    assert.deepEqual(updated.records.map(({ source_url }: { source_url: string }) => source_url), [loanUrl, loanUrl]);
    await assert.rejects(runParser({ ...options, source: { ...options.source, discover: async () => { throw new Error('discovery failed'); } } }), /discovery failed/);
    await assert.rejects(readFile(join(rootDir, 'data', 'youth.json')), { code: 'ENOENT' });
    assert.equal(output.records[0].age_lower, null);
    assert.equal(output.records[0].isNative, false);
    assert.equal(output.records[0].is_organization, true);
    assert.equal(output.records[2].is_organization, false);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('crawls nested service pages and starts each run from fresh data', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'ccc-parser-test-'));
  let modelCalls = 0;
  let attachmentCalls = 0;
  const articleCategories = new Map<string, string>();
  const fetchHtml = async (input: string): Promise<string> => {
    const url = new URL(input);
    const section = url.searchParams.get('n');
    if (section === '082798040B8AF70C') return serviceHtml([
      ['本會場地租借', 'News_Link_pic.aspx?n=VENUE'],
      ['空間借用', 'News.aspx?n=SPACE'],
      ['為民服務', 'News.aspx?n=SERVICE'],
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
    const options = { fetchHtml, fetchAttachment, extractAttachmentText: async () => '補助要點文字', extract, dataDir: join(rootDir, 'data'), stateDir: join(rootDir, 'tmp'), revision: 'test-ipc' };
    const first = await runParser(options);
    assert.equal(first.total, 4);
    assert.equal(first.records, 1);
    assert.equal(first.failures.length, 0);
    assert.equal(modelCalls, 3);
    assert.equal(attachmentCalls, 1);
    assert.equal(articleCategories.get('其他服務'), '其他補助');

    const staleAttachment = join(rootDir, 'tmp', 'ipc-attachments', 'stale.pdf');
    await writeFile(staleAttachment, 'stale');
    const second = await runParser(options);
    assert.equal(second.reused, 0);
    assert.equal(modelCalls, 6);
    assert.equal(attachmentCalls, 2);
    await assert.rejects(readFile(staleAttachment), { code: 'ENOENT' });

    const output = JSON.parse(await readFile(join(rootDir, 'data', 'indigenous.json'), 'utf8'));
    assert.equal(output.source, SOURCE_URL);
    assert.match(output.updated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+08:00$/);
    assert.equal(Date.parse(output.updated_at), Date.parse(output.generated_at));
    assert.equal(output.complete, true);
    assert.equal(output.records.length, 1);
    assert.deepEqual(output.records[0], {
      id: 1,
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
