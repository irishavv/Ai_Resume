import { z } from 'zod';
import { copy } from '../constants/copy.js';

/** Chat message submitted from the composer. 1..2000 characters, trimmed. */
export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, copy.validation.messageRequired)
    .max(2000, copy.validation.messageTooLong),
});

export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_COUNTER_THRESHOLD = 1600;

export default messageSchema;
