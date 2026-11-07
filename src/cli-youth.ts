import { resolve } from 'node:path';
import { createExtractor, YOUTH_EXTRACTION_REVISION } from './extract.js';
import { runParser } from './run.js';
import { createHtmlFetcher } from './source.js';
import { discoverYouthArticles, parseYouthArticle, parseYouthAttachments, YOUTH_SOURCE_URL } from './youth-source.js';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Set OPENROUTER_API_KEY before running the youth parser.');
  process.exitCode = 1;
} else {
  try {
    const summary = await runParser({
      fetchHtml: createHtmlFetcher(),
      extract: createExtractor(apiKey, 'youth'),
      dataDir: resolve('data'),
      stateDir: resolve('tmp'),
      revision: YOUTH_EXTRACTION_REVISION,
      source: {
        url: YOUTH_SOURCE_URL,
        name: 'youth',
        outputFile: 'youth.json',
        discover: discoverYouthArticles,
        parseArticle: parseYouthArticle,
        parseAttachments: parseYouthAttachments,
      },
      log: console.log,
    });
    console.log(`Finished: ${summary.total} pages, ${summary.records} subsidy records, ${summary.reused} reused`);
    if (summary.failures.length) {
      for (const failure of summary.failures) console.error(`${failure.url}: ${failure.error}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
