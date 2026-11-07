import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { classifyDatasets, createGemmaClassificationEngine, labelDefinitionsSchema } from './classify.js';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Set OPENROUTER_API_KEY before classifying datasets.');
  process.exitCode = 1;
} else {
  try {
    const dataDir = resolve('data');
    const labels = labelDefinitionsSchema.parse(JSON.parse(await readFile(resolve(dataDir, 'label.json'), 'utf8')));
    const count = await classifyDatasets(dataDir, createGemmaClassificationEngine(apiKey, labels), labels, console.log);
    console.log(`Classified ${count} records and wrote data/category.json`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
