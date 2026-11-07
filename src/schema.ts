import { z } from 'zod';

export const subsidySchema = z.object({
  name: z.string().trim().min(1),
  beneficiary_type: z.enum(['individual', 'family', 'organization', 'unspecified']),
  application_by: z.enum(['beneficiary', 'parent_or_guardian', 'service_provider', 'organization', 'unspecified']),
  age_min_months: z.number().int().nonnegative().nullable(),
  age_min_inclusive: z.boolean().nullable(),
  age_max_months: z.number().int().nonnegative().nullable(),
  age_max_inclusive: z.boolean().nullable(),
  school_stage: z.string().trim().nullable(),
  indigenous_requirement: z.enum(['required', 'excluded', 'not_required', 'unspecified']),
  gender_restriction: z.enum(['male_only', 'female_only', 'none', 'unspecified']),
  registered_in: z.string().trim().nullable(),
  registration_min_months: z.number().int().nonnegative().nullable(),
  actual_residence_required: z.boolean().nullable(),
  income_requirement: z.string().trim().nullable(),
  other_requirements: z.array(z.string().trim().min(1)),
  benefit_detail: z.string().trim().nullable(),
  application_period: z.string().trim().nullable(),
  source_kind: z.enum(['service_detail', 'faq', 'amendment']),
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
