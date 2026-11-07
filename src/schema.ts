import { z } from 'zod';

export const subsidySchema = z.object({
  name: z.string().trim().min(1),
  applicant_type: z.enum(['individual_or_family', 'organization', 'unspecified']),
  age_min_months: z.number().int().nonnegative().nullable(),
  age_min_inclusive: z.boolean().nullable(),
  age_max_months: z.number().int().nonnegative().nullable(),
  age_max_inclusive: z.boolean().nullable(),
  indigenous_requirement: z.enum(['required', 'excluded', 'not_required', 'unspecified']),
  gender_restriction: z.enum(['male_only', 'female_only', 'none', 'unspecified']),
  evidence_quotes: z.array(z.string().trim().min(1)).min(1),
}).strict();

export const extractionSchema = z.object({
  subsidies: z.array(subsidySchema),
}).strict();

export type Subsidy = z.infer<typeof subsidySchema>;

export interface Article {
  url: string;
  title: string;
  publishedAt: string | null;
  body: string;
}

export interface ArticleListing {
  url: string;
  title: string;
  publishedAt: string | null;
}

export interface SubsidyRecord extends Subsidy {
  source_url: string;
  article_title: string;
  published_at: string | null;
}
