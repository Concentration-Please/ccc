import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { extractionSchema, sharedCategories, youthExtractionSchema, type Article, type Subsidy } from './schema.js';

export const MODEL_ID = 'google/gemma-4-26b-a4b-it';
export const EXTRACTION_REVISION = `${MODEL_ID}:ipc-prompt-11:schema-6`;
export const YOUTH_EXTRACTION_REVISION = `${MODEL_ID}:youth-prompt-9:schema-6`;

type ExtractSource = 'indigenous' | 'youth';
const SOURCE_PROMPTS: Record<ExtractSource, string> = {
  indigenous: '你是臺灣原住民族公共服務資訊擷取器。只根據提供的臺北市政府原住民族事務委員會「為民服務」網頁正文與可讀附件文字，擷取可申請的補助、津貼、費用減免、獎勵或免費服務。正文或附件列有具體補助資格與內容時，不可回傳空陣列。純宣導、自費服務、已停止的方案，以及只有外部連結而沒有服務內容的頁面，回傳空陣列。不要從未提供文字的附件或連結推測內容。',
  youth: '你是臺北市政府青年局公共服務資訊擷取器。只根據提供的「補助貸款」網頁正文與可讀附件文字，擷取補助、津貼、利息補貼或政策性貸款。只要正文或附件列有具體申請資格與補助內容，即使是修正公告或要點全文也要擷取。當年度預算用罄或暫停受理只是不受理該期間的申請，仍要記錄方案，並將此限制寫入 conditions。純宣導、永久停止的方案，以及只有外部連結而沒有服務內容的頁面，回傳空陣列。不要從未提供文字的附件或連結推測內容。',
};
const OUTPUT_RULES: Record<ExtractSource, string> = {
  indigenous: '每筆紀錄須對應一項獨立給付或一條有不同給付內容的申請資格路徑。同一給付不可僅因金額級距、申請管道或文件不同而重複拆筆；不同給付不可合成一筆總覽。僅輸出以下欄位，不要輸出來源網址或分類，這兩項由程式填入。',
  youth: '每筆紀錄須對應一項獨立給付或一條有不同給付內容的申請資格路徑。同一給付不可僅因金額級距、申請管道或文件不同而重複拆筆；不同給付不可合成一筆總覽。貸款與利息補貼若有不同的給付內容或資格，利息補貼另輸出一筆；同頁各項目共享的申請資格及申請方式，須完整保留在每筆資料。僅輸出以下欄位與 category，不要輸出來源網址，這項由程式填入。',
};

const FIELD_PROMPT = `name：直接取用網頁標題或正文的原話，可以截短，但盡量不改語意，不要自創名稱。
summary：用一句中文概述這項補助及其受益對象。
subsidy_target：詳細記錄補助的費用、物品、服務、活動、金額、頻率或上限；只寫提供的正文或附件文字確實提及的內容。
is_organization：實際受益或可申請者是團體／機構時為 true；個人或家庭為 false。機構代個人送件或請款時仍為 false。
registration_months：實際受益或可申請者本人明確需要設籍滿幾個月時填整數。原文以年表示時換算為月；未明示設籍期間時填 null。團體代表人、家長等其他角色的設籍期間不要填在這裡，要完整列入 conditions。只要求設籍某地而未指定期間時也填 null。
age_lower、age_upper：實際受益或可申請者本人明確的最低、最高年齡界線，以歲數整數填入；未明示該界線時填 null。「滿 55 歲」的 age_lower 為 55，「未滿 65 歲」的 age_upper 為 65，是否含界線仍依原文寫入 conditions。不要從學校年級、就學階段、出生日期、發布日期或其他間接資訊推算年齡；只寫月齡時不要換算或四捨五入為整數歲。不要把家長、代表人等其他角色的年齡填在這兩欄。不同資格路徑有不同年齡界線時分筆輸出。
isNative：提供的正文或附件文字明確要求實際受益或可申請者具原住民身分才能申請時為 true；沒有明確要求時為 false。不要僅因網站、分類或方案名稱提及原住民就推定為 true；其他角色的原住民身分限制只保留在 conditions。
conditions：所有明確的申請或受益資格與限制，逐項寫成字串；一個獨立條件一項。保留條件所屬對象、數值、單位及例外，例如原住民身分、設籍地與期間、年齡、性別、收入、就學、團體組成、服務提供者、申請期間、不得重複申請等。對象不同的條件不要混成一項。沒有明確條件時用空陣列。不要根據發布日推算年齡或有效性，也不要補上正文沒有的條件。
application_method_or_documents：逐項記錄提供的正文或附件文字明示的申請方式、送件管道或步驟，以及應備文件。不要把申請資格、補助內容或僅供參考的連結填入此欄；未提及時用空陣列，不要推測未提供文字的附件或外部頁面的內容。`;
const YOUTH_CATEGORY_PROMPT = `category：依每筆補助的實際用途選一個分類：${sharedCategories.join('、')}。只有明確符合分類名稱時才使用該分類；沒有適合分類時選「其他」。不得因服務來自青年局而自行新增分類。`;
const YOUTH_ROLE_PROMPT = '若申請人是公司、商業、有限合夥、學校、機構或團體，即使其代表人是青年，is_organization 仍為 true，age_lower 和 age_upper 都為 null；代表人的年齡保留在 conditions。個人「已成年」不是明示的整數歲數，不可換算為 18 歲。';
const eligibilityReviewSchema = z.object({
  reviews: z.array(z.object({
    index: z.number().int().nonnegative(),
    age_lower: z.number().int().nonnegative().nullable(),
    age_upper: z.number().int().nonnegative().nullable(),
    isNative: z.boolean(),
    age_lower_evidence: z.string().nullable(),
    age_upper_evidence: z.string().nullable(),
    native_evidence: z.string().nullable(),
  }).strict()),
}).strict();

export function createExtractor(apiKey: string, source: ExtractSource = 'indigenous'): (article: Article) => Promise<Subsidy[]> {
  const openrouter = createOpenRouter({ apiKey, compatibility: 'strict' });
  const model = openrouter.chat(MODEL_ID, { provider: { require_parameters: true } });
  return (article) => extractSubsidies(article, model, source);
}

function formatAttachments(article: Article): string {
  if (!article.attachments?.length) return '';
  const prioritized = [...article.attachments].sort((left, right) =>
    Number(/要點|辦法|公告|須知|計畫|說明/.test(right.title)) - Number(/要點|辦法|公告|須知|計畫|說明/.test(left.title)));
  let remaining = 24_000;
  const sections: string[] = [];
  for (const attachment of prioritized) {
    if (remaining <= 0) break;
    const text = attachment.text.slice(0, Math.min(8_000, remaining));
    remaining -= text.length;
    sections.push(`附件「${attachment.title}」：\n${text}`);
  }
  return `\n附件文字：\n${sections.join('\n\n')}`;
}

function ageEvidenceMatches(evidence: string | null, age: number | null): boolean {
  if (age === null || !evidence?.includes('歲')) return false;
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const values = [...evidence.matchAll(/(?<!\d)\d{1,3}(?!\d)|[零〇一二兩三四五六七八九十百]+/g)].map(([token]) => {
    if (/^\d/.test(token)) return Number(token);
    let total = 0;
    let digit = 0;
    for (const char of token) {
      if (char === '百' || char === '十') {
        total += (digit || 1) * (char === '百' ? 100 : 10);
        digit = 0;
      } else {
        digit = digits[char] ?? 0;
      }
    }
    return total + digit;
  });
  return values.includes(age);
}

async function reviewEligibility(article: Article, subsidies: Subsidy[], model: LanguageModel, source: ExtractSource, sourceText: string): Promise<Subsidy[]> {
  const sourceHasAgeLimit = /(?:\d{1,3}|[一二兩三四五六七八九十百]+)\s*歲/.test(sourceText);
  const candidates = subsidies.flatMap((subsidy, index) => {
    const checkAge = source === 'youth' && !subsidy.is_organization
      && (subsidy.age_lower === null || subsidy.age_upper === null)
      && (subsidy.conditions.some((condition) => /歲|年齡/.test(condition)) || sourceHasAgeLimit);
    const checkNative = source === 'indigenous' && !subsidy.isNative;
    return checkAge || checkNative ? [{ index, checkAge, checkNative, name: subsidy.name, is_organization: subsidy.is_organization, age_lower: subsidy.age_lower, age_upper: subsidy.age_upper, isNative: subsidy.isNative, conditions: subsidy.conditions }] : [];
  });
  if (!candidates.length) return subsidies;

  const result = await generateText({
    model,
    system: '你是補助資料複查員。只核對列出的欄位，不要新增或刪除補助。年齡欄只填實際個人申請者或受益者本人明示的歲數界線；公司、團體代表人或家長的年齡不可填入。isNative 只有實際申請者或受益者明確須具原住民身分時才為 true；不得僅由網站、分類或名稱推定。每個年齡界線和原住民身分修正都要分別提供正文或附件文字中的原句作為 evidence；沒有明確原句就回傳 null 並保持原值。',
    prompt: `來源文字：\n${sourceText}\n\n待複查紀錄：\n${JSON.stringify(candidates)}`,
    output: Output.object({ schema: eligibilityReviewSchema }),
    temperature: 0,
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(90_000),
  });
  const normalizedSource = `${article.body}\n${article.attachments?.map((attachment) => attachment.text).join('\n') ?? ''}`.replace(/\s+/g, '');
  return subsidies.map((subsidy, index) => {
    const candidate = candidates.find((item) => item.index === index);
    const review = result.output.reviews.find((item) => item.index === index);
    if (!candidate || !review) return subsidy;
    const hasEvidence = (evidence: string | null) => Boolean(evidence && normalizedSource.includes(evidence.replace(/\s+/g, '')));
    const lower = candidate.checkAge && hasEvidence(review.age_lower_evidence) && ageEvidenceMatches(review.age_lower_evidence, review.age_lower);
    const upper = candidate.checkAge && hasEvidence(review.age_upper_evidence) && ageEvidenceMatches(review.age_upper_evidence, review.age_upper);
    const native = candidate.checkNative && review.isNative && hasEvidence(review.native_evidence) && /原住民/.test(review.native_evidence ?? '');
    return {
      ...subsidy,
      age_lower: lower ? subsidy.age_lower ?? review.age_lower : subsidy.age_lower,
      age_upper: upper ? subsidy.age_upper ?? review.age_upper : subsidy.age_upper,
      isNative: native ? true : subsidy.isNative,
    };
  });
}

export async function extractSubsidies(article: Article, model: LanguageModel, source: ExtractSource = 'indigenous'): Promise<Subsidy[]> {
  let lastError: unknown;
  let subsidies: Subsidy[] | undefined;
  const sourceText = `${article.body}${formatAttachments(article)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system: `${SOURCE_PROMPTS[source]}\n\n${OUTPUT_RULES[source]}\n\n${FIELD_PROMPT}${source === 'youth' ? `\n${YOUTH_CATEGORY_PROMPT}\n${YOUTH_ROLE_PROMPT}` : ''}`,
        prompt: `來源網址：${article.url}\n${source === 'indigenous' ? `分類：${article.category}\n` : ''}標題：${article.title}\n發布日期：${article.publishedAt ?? '未提供'}\n內文：\n${sourceText}${source === 'youth' && attempt > 0 ? '\n請再次檢查：若有具體的補助、津貼或貸款資格與內容，不可回傳空陣列。' : ''}`,
        output: Output.object({ schema: source === 'youth' ? youthExtractionSchema : extractionSchema }),
        temperature: 0,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(90_000),
      });
      const extracted = result.output.subsidies.map((subsidy) => subsidy.is_organization
        ? { ...subsidy, age_lower: null, age_upper: null }
        : subsidy);
      if (attempt === 0 && extracted.length === 0 && /(申請|適用對象)/.test(sourceText) && /(補助|津貼|貸款|獎勵|減免|免費)/.test(sourceText)) continue;
      subsidies = extracted;
      break;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 401 || status === 402 || status === 403) throw error;
      lastError = error;
    }
  }
  if (!subsidies) throw lastError;
  return reviewEligibility(article, subsidies, model, source, sourceText);
}
