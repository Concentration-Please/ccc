import { z } from 'zod';

export const subsidySchema = z.object({
  is_organization: z.boolean(),
  registration_months: z.number().int().nonnegative().nullable(),
  age_lower: z.number().int().nonnegative().nullable(),
  age_upper: z.number().int().nonnegative().nullable(),
  isNative: z.boolean(),
  name: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  subsidy_target: z.string().trim().min(1),
  conditions: z.array(z.string().trim().min(1)),
  application_method_or_documents: z.array(z.string().trim().min(1)),
}).strict();

export const sharedCategories = [
  '住宅建購、修繕補助',
  '原民問答',
  '居住照顧',
  '急難救助',
  '托育服務',
  '教育扶助',
  '法律服務',
  '衛生扶助',
  '貸款利息補貼',
  '長青服務',
  '體育補助',
  '其他',
] as const;

export const youthSubsidySchema = subsidySchema.extend({ category: z.enum(sharedCategories) });

export const extractionSchema = z.object({
  subsidies: z.array(subsidySchema),
}).strict();

export const youthExtractionSchema = z.object({
  subsidies: z.array(youthSubsidySchema),
}).strict();

export type Subsidy = z.infer<typeof subsidySchema>;
export type YouthSubsidy = z.infer<typeof youthSubsidySchema>;

export interface Article {
  url: string;
  title: string;
  category: string;
  publishedAt: string | null;
  body: string;
  attachments?: { title: string; text: string }[];
}

export interface ArticleListing {
  url: string;
  title: string;
  category: string;
  publishedAt: string | null;
}

export interface SubsidyRecord extends Subsidy {
  id: number;
  category: string;
  source_url: string;
}
