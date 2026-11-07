import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output, type LanguageModel } from 'ai';
import { extractionSchema, type Article, type Subsidy } from './schema.js';
import { normalizeText } from './source.js';

export const MODEL_ID = 'google/gemma-4-26b-a4b-it';
export const EXTRACTION_REVISION = `${MODEL_ID}:prompt-1:schema-1`;

const SYSTEM_PROMPT = `你是臺灣政府健康服務資訊擷取器。只根據提供的新聞稿標題和內文擷取民眾實際可使用的公費疫苗、免費健康服務或補助。純宣導、活動贈品、自費服務、假設性方案，以及僅提到補助卻沒有說明民眾可使用的項目，回傳空陣列。

一項服務若有數組不同資格，每組各輸出一筆；同組資格不要重複。不要把機構的補助資格誤當成民眾資格。不要推論新聞稿未說明的限制，也不要判斷歷史公告現在是否仍有效。

年齡統一換算成整數月：「以上／年滿」含下限，「以下」含上限，「未滿」不含上限，「超過」不含下限。沒有數值年齡或只有年級、出生年度時，數值欄位和對應的含界線欄位都設為 null。

原住民身分：required 為僅原住民，excluded 為明確排除原住民，not_required 為明確不限制，未說明為 unspecified。性別：male_only、female_only、none（明確不限制）、unspecified（未說明）。

每筆至少附一段直接複製自內文、能支持方案及資格的短引文；需要多段時放入 evidence_quotes。不得改寫引文。`;

export function createExtractor(apiKey: string): (article: Article) => Promise<Subsidy[]> {
  const openrouter = createOpenRouter({ apiKey, compatibility: 'strict' });
  const model = openrouter.chat(MODEL_ID, { provider: { require_parameters: true } });
  return (article) => extractSubsidies(article, model);
}

export function validateSubsidies(subsidies: Subsidy[], body: string): void {
  const normalizedBody = normalizeText(body);
  for (const subsidy of subsidies) {
    const { age_min_months: min, age_max_months: max } = subsidy;
    if ((min === null) !== (subsidy.age_min_inclusive === null)) {
      throw new Error(`Lower age boundary is inconsistent: ${subsidy.name}`);
    }
    if ((max === null) !== (subsidy.age_max_inclusive === null)) {
      throw new Error(`Upper age boundary is inconsistent: ${subsidy.name}`);
    }
    if (min !== null && max !== null && (min > max || (min === max && (!subsidy.age_min_inclusive || !subsidy.age_max_inclusive)))) {
      throw new Error(`Invalid age range: ${subsidy.name}`);
    }
    for (const quote of subsidy.evidence_quotes) {
      if (!normalizedBody.includes(normalizeText(quote))) {
        throw new Error(`Evidence is not in the article: ${subsidy.name}`);
      }
    }
  }
}

export async function extractSubsidies(article: Article, model: LanguageModel): Promise<Subsidy[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: `標題：${article.title}\n發布日期：${article.publishedAt}\n內文：\n${article.body}`,
        output: Output.object({ schema: extractionSchema }),
        temperature: 0,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(90_000),
      });
      const subsidies = result.output.subsidies;
      validateSubsidies(subsidies, article.body);
      return subsidies;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 401 || status === 402 || status === 403) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
