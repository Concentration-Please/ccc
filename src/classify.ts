import { randomUUID } from 'node:crypto';
import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { MODEL_ID } from './extract.js';

const recordSchema = z.object({ id: z.number(), summary: z.string().min(1) }).passthrough();
const datasetSchema = z.object({
  complete: z.literal(true),
  records: z.array(recordSchema),
}).passthrough();
const categoriesSchema = z.object({ categories: z.array(z.string().trim().min(2)).min(2).max(20) }).strict();

export const labelDefinitionsSchema = z.record(z.string().min(1), z.string().min(1));

export interface Classification {
  category: string;
  label: string[];
}

export interface ClassificationEngine {
  createCategories: (summaries: string[]) => Promise<string[]>;
  classify: (summary: string, categories: string[]) => Promise<Classification>;
}

export function createGemmaClassificationEngine(apiKey: string, labels: Record<string, string>, model?: LanguageModel): ClassificationEngine {
  const keys = Object.keys(labels);
  if (keys.length === 0) throw new Error('data/label.json must define at least one label');
  const classifierModel = model ?? createOpenRouter({ apiKey, compatibility: 'strict' }).chat(MODEL_ID, { provider: { require_parameters: true } });
  return {
    async createCategories(summaries) {
      const result = await generateText({
        model: classifierModel,
        system: '你是臺灣公共補助資料分類員。根據所有補助摘要，自行建立 4 到 8 個互斥、簡短、以補助用途命名的繁體中文類別，類別名稱大約四個字左右。跨資料來源共用類別；不要以網站、機關、問答頁或受益族群作分類。加入「其他」供無法歸入明確用途的摘要使用。只輸出類別名稱。',
        prompt: summaries.map((summary, index) => `${index + 1}. ${summary}`).join('\n'),
        output: Output.object({ schema: categoriesSchema }),
        temperature: 0,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(120_000),
      });
      return [...new Set(result.output.categories.map((category) => category.trim()))];
    },
    async classify(summary, categories) {
      const schema = z.object({
        category: z.enum(categories as [string, ...string[]]),
        label: z.array(z.enum(keys as [string, ...string[]])),
      }).strict();
      const result = await generateText({
        model: classifierModel,
        system: `只根據單筆摘要判斷。category 必須從以下類別選一個最符合補助用途的名稱：${categories.join('、')}。摘要無法明確歸類時選「其他」。label 可複選，只在摘要明確指出受益對象符合時加入，不得因資料來源或 category 推定。可用 label：${Object.entries(labels).map(([key, meaning]) => `${key}（${meaning}）`).join('、')}。沒有符合者回傳空陣列。`,
        prompt: `摘要：${summary}`,
        output: Output.object({ schema }),
        temperature: 0,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(90_000),
      });
      return { category: result.output.category, label: [...new Set(result.output.label)] };
    },
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

export async function classifyDatasets(dataDir: string, engine: ClassificationEngine, labels: Record<string, string>, log?: (message: string) => void): Promise<number> {
  const names = (await readdir(dataDir)).filter((name) => name.endsWith('.json') && name !== 'label.json' && name !== 'category.json').sort();
  const datasets: { path: string; dataset: z.infer<typeof datasetSchema> }[] = [];
  for (const name of names) {
    const path = join(dataDir, name);
    const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (typeof raw !== 'object' || raw === null || !('records' in raw)) continue;
    datasets.push({ path, dataset: datasetSchema.parse(raw) });
  }
  if (datasets.length === 0) throw new Error(`No dataset JSON files found in ${dataDir}`);

  const summaries = datasets.flatMap(({ dataset }) => dataset.records.map((record) => record.summary));
  const categories = [...new Set(await engine.createCategories([...new Set(summaries)]))];
  if (categories.length < 2 || categories.some((category) => !category.trim())) throw new Error('Gemma returned invalid categories');
  if (!categories.includes('其他')) categories.push('其他');
  log?.(`Created ${categories.length} categories; classifying ${summaries.length} records`);

  let count = 0;
  for (const { path, dataset } of datasets) {
    for (const record of dataset.records) {
      const result = await engine.classify(record.summary, categories);
      if (!categories.includes(result.category) || !Array.isArray(result.label) || result.label.some((label) => !(label in labels))) {
        throw new Error(`Invalid classification for ${path} record ${record.id}`);
      }
      record.category = result.category;
      record.label = [...new Set(result.label)];
      count += 1;
      if (count % 10 === 0 || count === summaries.length) log?.(`Classified ${count}/${summaries.length} records`);
    }
  }
  const used = new Set(datasets.flatMap(({ dataset }) => dataset.records.map((record) => record.category)));
  const now = new Date();
  for (const { path, dataset } of datasets) {
    dataset.updated_at = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
    await writeJson(path, dataset);
  }
  await writeJson(join(dataDir, 'category.json'), categories.filter((category) => used.has(category)));
  return count;
}
