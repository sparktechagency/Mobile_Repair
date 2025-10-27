import { z } from "zod";

const locationSchema = z.object({
  latitude: z
    .number({ required_error: "Latitude is required" })
    .min(-90, "Latitude cannot be less than -90")
    .max(90, "Latitude cannot be greater than 90"),
    
  longitude: z
    .number({ required_error: "Longitude is required" })
    .min(-180, "Longitude cannot be less than -180")
    .max(180, "Longitude cannot be greater than 180"),
});

const createServiceOrderValidation = z.object({
  body: z.object({
    clientName: z
      .string({ required_error: "Client name is required" })
      .min(3, "Client name must be at least 3 characters"),
    phoneNumber: z
      .string({ required_error: "Phone number is required" })
      .min(10, "Phone number must be at least 10 digits"),
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email format"),
    serviceAddress: z
      .string({ required_error: "Service address is required" }),
    location: locationSchema,
    brand: z.string({ required_error: "Brand name is required" }),
    productline: z.string({ required_error: "Product line is required" }),
    model: z.string({ required_error: "Model is required" }),
    variant: z.string({ required_error: "Variant is required" }),
    issueType: z.string({ required_error: "Issue type is required" }),
    issueDescription: z
      .string()
      .optional(),
    preferedDate: z
      .string({ required_error: "Preferred date is required" })
      .refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
    preferedTime: z
      .string({ required_error: "Preferred time is required" }),
    isAllAgreement: z
      .boolean({ required_error: "Agreement acceptance is required" }),
    status: z
      .enum(["pending", "inprogress", "completed"])
      .default("pending"),
    serviceProviderId: z
      .string()
      .optional()
      .nullable(),
  }),
});

const updateStatusValidation = z.object({
  body: z.object({
    status: z.enum(["pending", "inprogress", "completed"], {
      required_error: "Status is required",
      invalid_type_error: "Status must be pending, inprogress, or completed",
    }),
    serviceProviderId: z.string().optional().nullable(),
  }),
});

export const ServiceOrderValidation = {
  createServiceOrderValidation,
  updateStatusValidation,
};
