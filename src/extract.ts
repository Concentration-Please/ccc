import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output, type LanguageModel } from 'ai';
import { extractionSchema, type Article, type Subsidy } from './schema.js';
import { normalizeText } from './source.js';

export const MODEL_ID = 'google/gemma-4-26b-a4b-it';
export const EXTRACTION_REVISION = `${MODEL_ID}:ipc-prompt-3:schema-3`;

const SYSTEM_PROMPT = `你是臺灣原住民族公共服務資訊擷取器。只根據提供的臺北市政府原住民族事務委員會「為民服務」來源文件，擷取可申請的補助、津貼、費用減免、獎勵或免費服務。純宣導、自費服務、已停止的方案、只有其他網站連結而未說明服務內容的項目，回傳空陣列。

一項服務若有數組不同資格或不同受益對象，每組各輸出一筆；不同補助項目若資格或金額不同，也分筆。beneficiary_type 是實際受益的個人、家庭或團體。application_process 以簡短文字記錄誰有申請權、誰遞件及誰請款；未說明則填 null。父母為兒童申請而機構彙整送件、心理諮商機構替個人請款時，受益者仍是個人。

年齡欄位只表示受益者的整數月門檻：「55至64歲」為下限660個月（包含）、上限780個月（不包含）；「6歲以下」上限84個月（不包含）；「未滿6歲」上限72個月（不包含）。只有學籍、年級或出生年度，沒有明確數值年齡時，年齡及界線欄位都設為 null，學籍或年級寫入 school_stage。不要用文章發布日推算年齡或出生日期。若年齡是申請人、家屬或參與者的條件，寫入 other_requirements 並標示對象，不要填入受益者年齡欄位。

indigenous_requirement、gender_restriction、registered_in、registration_min_months 和 actual_residence_required 只表示受益者本人的條件。個人原住民身分：required 為僅原住民，excluded 為明確排除原住民，not_required 為明確不限制，未說明為 unspecified；團體受益時設為 unspecified。性別：male_only、female_only、none（明確不限制）、unspecified（未說明）。只有明確要求實際居住時 actual_residence_required 才填 true，明確不要求時填 false，其餘填 null。家長、配偶、公司代表人或活動參與者的條件，放到 other_requirements。

income_requirement 保留低收入戶或家庭收入門檻原文，不要把隨年度變動的標準換算為固定金額。other_requirements 的每項填 subject 與 text；subject 可為 beneficiary、applicant、guardian、household、organization、representative、participant、service_provider、property_or_event 或 other。團體社員比例、代表人身分與活動參與比例不得誤填成個人的原住民身分限制。房產、家庭人數、失能、就學、服務機構、不得重複申請及例外條件也分別列入。互為替代的資格路徑分成不同筆。

benefit_detail 簡述補助內容、金額、頻率或上限；application_period 記錄明確的申請期限或週期；required_documents 列出明確要求的申請文件。沒有就填 null 或空陣列。source_kind：服務網頁為 service_detail，問答或摘要為 faq，修正公告為 amendment，附件中的完整要點／計畫為 attachment_rule，申請表或範例為 attachment_form。source_version 保留文件標註的版本或生效日期，未標註時填 null。申請表空白欄位不得視為申請資格；修正公告只提供部分規則時，不要補推其他條件，也不要判定歷史文件現在是否仍有效。

每筆至少附一段直接複製自來源文件、能支持服務及主要資格的短引文。evidence 每項含該引文的 source_url、source_title 與 quote；網址與標題必須是實際提供的網頁或附件。不得改寫引文，也不要把不同版本文件的條件混成同一筆。`;

export function createExtractor(apiKey: string): (article: Article) => Promise<Subsidy[]> {
  const openrouter = createOpenRouter({ apiKey, compatibility: 'strict' });
  const model = openrouter.chat(MODEL_ID, { provider: { require_parameters: true } });
  return (article) => extractSubsidies(article, model);
}

export function validateSubsidies(subsidies: Subsidy[], sourceTexts: ReadonlyMap<string, string>): void {
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
    for (const evidence of subsidy.evidence) {
      const sourceText = sourceTexts.get(evidence.source_url);
      if (!sourceText || !normalizeText(sourceText).includes(normalizeText(evidence.quote))) {
        throw new Error(`Evidence is not in its source: ${subsidy.name}`);
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
        prompt: `來源網址：${article.url}\n標題：${article.title}\n發布日期：${article.publishedAt ?? '未提供'}\n內文：\n${article.body}`,
        output: Output.object({ schema: extractionSchema }),
        temperature: 0,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(90_000),
      });
      const subsidies = result.output.subsidies;
      validateSubsidies(subsidies, new Map([[article.url, article.body]]));
      return subsidies;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 401 || status === 402 || status === 403) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
