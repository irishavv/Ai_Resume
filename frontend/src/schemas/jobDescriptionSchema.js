import { z } from 'zod';
import { copy } from '../constants/copy.js';

/** Job description submitted to the job match endpoint. 20..20000 characters, trimmed. */
export const jobDescriptionSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(1, copy.validation.jobDescriptionRequired)
    .min(20, copy.validation.jobDescriptionTooShort)
    .max(20000, copy.validation.jobDescriptionTooLong),
});

export const JOB_DESCRIPTION_MIN_LENGTH = 20;
export const JOB_DESCRIPTION_MAX_LENGTH = 20000;
export const JOB_DESCRIPTION_COUNTER_THRESHOLD = 18000;

export default jobDescriptionSchema;
