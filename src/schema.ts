import { z } from 'zod';

const requirementSchema = z.object({
  subject: z.enum(['beneficiary', 'applicant', 'guardian', 'household', 'organization', 'representative', 'participant', 'service_provider', 'property_or_event', 'other']),
  text: z.string().trim().min(1),
}).strict();

const evidenceSchema = z.object({
  source_url: z.url(),
  source_title: z.string().trim().min(1),
  quote: z.string().trim().min(1),
}).strict();

export const subsidySchema = z.object({
  name: z.string().trim().min(1),
  beneficiary_type: z.enum(['individual', 'family', 'organization', 'unspecified']),
  application_process: z.string().trim().nullable(),
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
  other_requirements: z.array(requirementSchema),
  benefit_detail: z.string().trim().nullable(),
  application_period: z.string().trim().nullable(),
  required_documents: z.array(z.string().trim().min(1)),
  source_kind: z.enum(['service_detail', 'faq', 'amendment', 'attachment_rule', 'attachment_form']),
  source_version: z.string().trim().nullable(),
  evidence: z.array(evidenceSchema).min(1),
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
