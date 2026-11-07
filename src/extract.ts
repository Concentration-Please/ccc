import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output, type LanguageModel } from 'ai';
import { extractionSchema, type Article, type Subsidy } from './schema.js';
import { normalizeText } from './source.js';

export const MODEL_ID = 'google/gemma-4-26b-a4b-it';
export const EXTRACTION_REVISION = `${MODEL_ID}:ipc-prompt-2:schema-2`;

const SYSTEM_PROMPT = `你是臺灣原住民族公共服務資訊擷取器。只根據提供的臺北市政府原住民族事務委員會「為民服務」網頁標題和正文，擷取可申請的補助、津貼、費用減免、獎勵或免費服務。純宣導、自費服務、已停止的方案、只有其他網站連結而未說明服務內容的項目，回傳空陣列。

一項服務若有數組不同資格或不同受益對象，每組各輸出一筆；同組資格不要重複。beneficiary_type 是實際受益的個人、家庭或團體；application_by 是遞交申請的人或機構。收托機構替兒童申請、心理諮商機構替個人請款時，受益者仍是個人。團體補助可以有原住民社員比例、代表人身分等條件，寫入 other_requirements，不要誤當成受益個人的 indigenous_requirement。

年齡欄位是整數月的門檻：「55至64歲」為下限660個月（包含）、上限780個月（不包含）；「6歲以下」上限84個月（不包含）；「未滿6歲」上限72個月（不包含）；「超過55歲」下限660個月（不包含）。只有學籍、年級或出生年度，沒有明確數值年齡時，年齡及界線欄位都設為 null，學籍或年級寫入 school_stage。不要用文章發布日推算年齡或出生日期。

個人原住民身分：required 為僅原住民，excluded 為明確排除原住民，not_required 為明確不限制，未說明為 unspecified；團體受益時設為 unspecified。性別：male_only、female_only、none（明確不限制）、unspecified（未說明）。registered_in 記錄明確的設籍地，registration_min_months 記錄明確的設籍月數；只有明確要求實際居住時 actual_residence_required 才填 true，明確不要求時填 false，其餘填 null。

income_requirement 保留低收入戶或家庭收入門檻原文，不要把隨年度變動的標準換算為固定金額。房產、家庭人數、失能、就學、服務機構、不得重複申請等其餘資格，分別寫入 other_requirements。benefit_detail 簡述補助內容與金額；application_period 記錄明確的申請期限或週期，沒有就填 null。這些文字欄位只記錄網頁實際說明的內容。

source_kind：服務頁的內容及資格說明為 service_detail，問答或摘要為 faq，修正要點／公告僅提供部分規則為 amendment。修正公告若明確指出一項可申請服務及變更的資格，可輸出 amendment 記錄；未提及的資格全部留空，不要當作完整規則。不要判定歷史網頁現今是否仍有效，也不要合併其他網頁的條件。

每筆至少附一段直接複製自內文、能支持服務及主要資格的短引文；需要多段時放入 evidence_quotes。不得改寫引文。`;

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
        prompt: `標題：${article.title}\n發布日期：${article.publishedAt ?? '未提供'}\n內文：\n${article.body}`,
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
