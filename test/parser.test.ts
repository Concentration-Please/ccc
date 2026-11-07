import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { extractSubsidies, MODEL_ID } from '../src/extract.js';
import { runParser } from '../src/run.js';
import { parseArticle, parseListing, SOURCE_URL } from '../src/source.js';
import type { Article, Subsidy } from '../src/schema.js';

function listingHtml(ids: string[], total: number): string {
  const rows = ids.map((id) => `<tr>
    <td data-title="標題"><a href="News_Content.aspx?n=BB5A41BA1E6CA260&sms=72544237BBE4C5F6&s=${id}">${id === 'A' ? '公費疫苗' : '健康資訊'}</a></td>
    <td data-title="發布日期">115-11-07</td>
  </tr>`).join('');
  return `<table>${rows}</table><ul class="C_Pager"><li><span class="count"><i>/</i>${total}</span></li></ul>`;
}

function articleHtml(body: string): string {
  return `<nav>免費服務</nav><div class="area-essay page-caption-p"><div class="essay"><p>${body}</p></div></div><footer>疫苗</footer>`;
}

const subsidy: Subsidy = {
  name: '公費流感疫苗',
  age_min_months: 780,
  age_min_inclusive: true,
  age_max_months: null,
  age_max_inclusive: null,
  indigenous_requirement: 'unspecified',
  gender_restriction: 'unspecified',
  evidence_quotes: ['65歲以上民眾可免費接種公費流感疫苗'],
};

test('parses the actual listing fields and only the article body', () => {
  const { entries, totalCount } = parseListing(listingHtml(['A'], 1), SOURCE_URL);
  assert.equal(totalCount, 1);
  assert.equal(entries[0]?.publishedAt, '2026-11-07');
  assert.match(entries[0]?.url ?? '', /News_Content\.aspx.*s=A/);
  assert.equal(parseArticle(articleHtml('一般健康資訊'), entries[0]!).body, '一般健康資訊');
});

test('sends one schema-constrained request through the AI SDK provider', async () => {
  let request: Record<string, unknown> | undefined;
  const openrouter = createOpenRouter({
    apiKey: 'test-key',
    compatibility: 'strict',
    fetch: async (_input, init) => {
      request = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1,
        model: MODEL_ID,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ subsidies: [subsidy] }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const article: Article = {
    url: 'https://health.gov.taipei/example',
    title: '公費流感疫苗',
    publishedAt: '2026-11-07',
    body: '65歲以上民眾可免費接種公費流感疫苗',
  };
  const result = await extractSubsidies(article, openrouter.chat(MODEL_ID, { provider: { require_parameters: true } }));
  assert.equal(result.length, 1);
  assert.equal(request?.model, MODEL_ID);
  assert.equal((request?.response_format as { type: string }).type, 'json_schema');
  assert.equal((request?.provider as { require_parameters: boolean }).require_parameters, true);
});

test('crawls every page, filters body text, and resumes without duplicate model calls', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'ccc-parser-test-'));
  const ids = Array.from({ length: 201 }, (_, index) => index === 0 ? 'A' : `B${index}`);
  let modelCalls = 0;
  const fetchHtml = async (url: string): Promise<string> => {
    const parsed = new URL(url);
    if (parsed.pathname.toLowerCase() === '/news.aspx') {
      return listingHtml(parsed.searchParams.get('page') === '2' ? ids.slice(200) : ids.slice(0, 200), 201);
    }
    return articleHtml(parsed.searchParams.get('s') === 'A' ? '65歲以上民眾可免費接種公費流感疫苗' : '一般健康資訊');
  };
  const extract = async (_article: Article): Promise<Subsidy[]> => {
    modelCalls += 1;
    return [subsidy];
  };

  try {
    const options = { fetchHtml, extract, outputDir, revision: 'test-1' };
    const first = await runParser(options);
    assert.equal(first.total, 201);
    assert.equal(first.candidates, 1);
    assert.equal(first.records, 1);
    assert.equal(first.failures.length, 0);
    assert.equal(modelCalls, 1);

    const second = await runParser(options);
    assert.equal(second.reused, 201);
    assert.equal(modelCalls, 1);

    const output = JSON.parse(await readFile(join(outputDir, 'subsidies.json'), 'utf8'));
    assert.equal(output.complete, true);
    assert.equal(output.records.length, 1);
    assert.equal(output.records[0].age_min_months, 780);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
