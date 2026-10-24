import { z } from 'zod';

/**
 * The console sign-in form. Mirrors the backend constraints on
 * `POST /api/admin/session` so an invalid submission never leaves the browser.
 */
export const adminLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Enter the administrator username.')
    .max(64, 'Usernames are limited to 64 characters.'),
  password: z
    .string()
    .min(1, 'Enter the administrator password.')
    .max(128, 'Passwords are limited to 128 characters.'),
});

export default adminLoginSchema;
