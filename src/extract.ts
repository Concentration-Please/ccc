import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output, type LanguageModel } from 'ai';
import { extractionSchema, type Article, type Subsidy } from './schema.js';

export const MODEL_ID = 'google/gemma-4-26b-a4b-it';
export const EXTRACTION_REVISION = `${MODEL_ID}:ipc-prompt-5:schema-5`;

const SYSTEM_PROMPT = `你是臺灣原住民族公共服務資訊擷取器。只根據提供的臺北市政府原住民族事務委員會「為民服務」網頁正文，擷取可申請的補助、津貼、費用減免、獎勵或免費服務。純宣導、自費服務、已停止的方案，以及只有外部連結而沒有服務內容的頁面，回傳空陣列。不要從未提供的附件或連結推測內容。

每項服務輸出一筆；若不同補助項目或不同資格路徑的補助內容不同，分筆輸出。僅輸出以下欄位，不要輸出來源網址或分類，這兩項由程式填入。

name：直接取用網頁標題或正文的原話，可以截短，但盡量不改語意，不要自創名稱。
summary：用一句中文概述這項補助及其受益對象。
subsidy_target：詳細記錄補助的費用、物品、服務、活動、金額、頻率或上限；只寫正文確實提及的內容。
is_organization：實際受益或可申請者是團體／機構時為 true；個人或家庭為 false。機構代個人送件或請款時仍為 false。
registration_months：實際受益或可申請者本人明確需要設籍滿幾個月時填整數。原文以年表示時換算為月；未明示設籍期間時填 null。團體代表人、家長等其他角色的設籍期間不要填在這裡，要完整列入 conditions。只要求設籍某地而未指定期間時也填 null。
age_lower、age_upper：實際受益或可申請者本人明確的最低、最高年齡界線，以歲數整數填入；未明示該界線時填 null。「滿 55 歲」的 age_lower 為 55，「未滿 65 歲」的 age_upper 為 65，是否含界線仍依原文寫入 conditions。不要從學校年級、就學階段、出生日期、發布日期或其他間接資訊推算年齡；只寫月齡時不要換算或四捨五入為整數歲。不要把家長、代表人等其他角色的年齡填在這兩欄。不同資格路徑有不同年齡界線時分筆輸出。
isNative：正文明確要求實際受益或可申請者具原住民身分才能申請時為 true；沒有明確要求時為 false。不要僅因網站、分類或方案名稱提及原住民就推定為 true；其他角色的原住民身分限制只保留在 conditions。
conditions：所有明確的申請或受益資格與限制，逐項寫成字串；一個獨立條件一項。保留條件所屬對象、數值、單位及例外，例如原住民身分、設籍地與期間、年齡、性別、收入、就學、團體組成、服務提供者、申請期間、不得重複申請等。對象不同的條件不要混成一項。沒有明確條件時用空陣列。不要根據發布日推算年齡或有效性，也不要補上正文沒有的條件。`;

export function createExtractor(apiKey: string): (article: Article) => Promise<Subsidy[]> {
  const openrouter = createOpenRouter({ apiKey, compatibility: 'strict' });
  const model = openrouter.chat(MODEL_ID, { provider: { require_parameters: true } });
  return (article) => extractSubsidies(article, model);
}

export async function extractSubsidies(article: Article, model: LanguageModel): Promise<Subsidy[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: `來源網址：${article.url}\n分類：${article.category}\n標題：${article.title}\n發布日期：${article.publishedAt ?? '未提供'}\n內文：\n${article.body}`,
        output: Output.object({ schema: extractionSchema }),
        temperature: 0,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(90_000),
      });
      return result.output.subsidies;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 401 || status === 402 || status === 403) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
