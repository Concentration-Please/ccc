import { z } from 'zod';

export const subsidySchema = z.object({
  is_organization: z.boolean(),
  registration_months: z.number().int().nonnegative().nullable(),
  name: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  subsidy_target: z.string().trim().min(1),
  conditions: z.array(z.string().trim().min(1)),
}).strict();

export const extractionSchema = z.object({
  subsidies: z.array(subsidySchema),
}).strict();

export type Subsidy = z.infer<typeof subsidySchema>;

export interface Article {
  url: string;
  title: string;
  category: string;
  publishedAt: string | null;
  body: string;
}

export interface ArticleListing {
  url: string;
  title: string;
  category: string;
  publishedAt: string | null;
}

export interface SubsidyRecord extends Subsidy {
  category: string;
  source_url: string;
}
