import { resolve } from 'node:path';
import { createExtractor, EXTRACTION_REVISION } from './extract.js';
import { runParser } from './run.js';
import { createHtmlFetcher } from './source.js';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Set OPENROUTER_API_KEY before running the parser.');
  process.exitCode = 1;
} else {
  try {
    const summary = await runParser({
      fetchHtml: createHtmlFetcher(),
      extract: createExtractor(apiKey),
      dataDir: resolve('data'),
      stateDir: resolve('tmp'),
      revision: EXTRACTION_REVISION,
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
