import { z } from "zod";

// ✅ Create validation
const createManagePriceSchema = z.object({
  body: z.object({
    icon: z.string().optional(),
    title: z.string({ required_error: "Title is required" }),
    minPrice: z.number({ required_error: "Price is required" }).min(0),
    maxPrice: z.number({ required_error: "Price is required" }).min(0),
  }),
});

// ✅ Update validation (partial)
const updateManagePriceSchema = z.object({
  body: z.object({
    icon: z.string().optional(),
    title: z.string().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const managePriceValidation = {
  createManagePriceSchema,
  updateManagePriceSchema,
};
