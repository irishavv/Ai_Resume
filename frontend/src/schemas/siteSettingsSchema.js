import { z } from 'zod';

const requiredText = (label, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} must not be empty.`)
    .max(max, `${label} is limited to ${max} characters.`);

const optionalText = (max) => z.string().max(max).optional().default('');

const questionSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Every question needs a short label.')
    .max(160, 'Question labels are limited to 160 characters.'),
  question: z
    .string()
    .trim()
    .min(1, 'Every question needs a prompt.')
    .max(1000, 'Question prompts are limited to 1000 characters.'),
  featured: z.boolean(),
});

const rubricCriterionSchema = z.object({
  criterion: z
    .string()
    .trim()
    .min(1, 'Each criterion needs a name.')
    .max(120, 'Criteria are limited to 120 characters.'),
  weight: z.coerce
    .number({ invalid_type_error: 'Weight must be a whole number.' })
    .int('Weight must be a whole number.')
    .min(0, 'Weight cannot be negative.')
    .max(100, 'Weight cannot exceed 100.'),
});

/**
 * The settings form. Only the invariants the backend enforces are repeated here
 * so the operator sees the problem while typing rather than after a round trip.
 */
export const siteSettingsSchema = z.object({
  site: z.object({
    name: requiredText('Site name', 80),
    shortName: requiredText('Short name', 40),
    initials: requiredText('Initials', 8),
    tagline: requiredText('Tagline', 80),
    accentColor: z
      .string()
      .trim()
      .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Use a hex colour such as #4f46e5.'),
    logoUrl: optionalText(2048),
  }),
  hero: z.object({
    eyebrow: requiredText('Eyebrow', 120),
    headline: requiredText('Headline', 160),
    summary: requiredText('Summary', 1000),
    summaryLabel: requiredText('Summary label', 60),
    suggestedTitle: requiredText('Suggested questions title', 120),
    suggestedSubtitle: requiredText('Suggested questions subtitle', 240),
    statLabels: z.object({
      projects: requiredText('Projects stat label', 40),
      skills: requiredText('Skills stat label', 40),
      education: requiredText('Education stat label', 40),
      experience: requiredText('Experience stat label', 40),
      learning: requiredText('Learning stat label', 40),
    }),
  }),
  questions: z
    .array(questionSchema)
    .min(1, 'Add at least one suggested question.')
    .max(30, 'At most 30 suggested questions are supported.'),
  features: z.object({
    chat: z.boolean(),
    jobMatch: z.boolean(),
    pdfExport: z.boolean(),
    languageToggle: z.boolean(),
    voiceInput: z.boolean(),
    themeToggle: z.boolean(),
  }),
  contact: z.object({
    showEmail: z.boolean(),
    showPhone: z.boolean(),
    showLocation: z.boolean(),
  }),
  footer: z.object({
    text: z.string().max(300, 'Footer text is limited to 300 characters.').default(''),
    showDisclaimer: z.boolean(),
    disclaimerText: z
      .string()
      .max(600, 'The disclaimer is limited to 600 characters.')
      .default(''),
  }),
  ai: z.object({
    historyLimit: z.coerce
      .number({ invalid_type_error: 'Enter a whole number.' })
      .int('Enter a whole number.')
      .min(1, 'Use at least 1.')
      .max(200, 'Use at most 200.'),
    rateLimitPerMinute: z.coerce
      .number({ invalid_type_error: 'Enter a whole number.' })
      .int('Enter a whole number.')
      .min(0, 'Cannot be negative.')
      .max(10000, 'Use at most 10000.'),
    jobMatchRubric: z
      .array(rubricCriterionSchema)
      .min(1, 'Add at least one criterion.')
      .max(10, 'At most 10 criteria are supported.')
      .refine(
        (criteria) => criteria.reduce((total, item) => total + Number(item.weight || 0), 0) === 100,
        'The weights must add up to exactly 100.',
      ),
  }),
});

export default siteSettingsSchema;
