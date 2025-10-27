import { z } from 'zod';

const userValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, { message: 'Full name is required' })
      .optional(),
    email: z.string().email({ message: 'Invalid email format' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' }),
    role: z.string(),
  }),
});

export const userValidation = {
  userValidationSchema,
};
