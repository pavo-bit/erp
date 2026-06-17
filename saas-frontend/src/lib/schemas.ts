import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";


export const loginSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(["ADMIN", "STUDENT", "PARENT", "ALUMNI"]),
  phone: z.string().optional(),
  // Student-specific
  rollNo: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  session: z.string().optional(),
  guardianName: z.string().optional(),
  parentId: z.string().optional(),
  // Parent-specific
  occupation: z.string().optional(),
  address: z.string().optional(),
  // Alumni-specific
  batch: z.string().optional(),
  currentRole: z.string().optional(),
  company: z.string().optional(),
  achievement: z.string().optional(),
});

export const noticeSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  content: z.string().min(1, "Content is required"),
  category: z.string().default("General"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  expiryDate: z.string().datetime().optional().nullable(),
});

export const eventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().optional(),
  date: z.string().datetime("Invalid date format"),
  endDate: z.string().datetime().optional().nullable(),
  venue: z.string().min(1, "Venue is required"),
  category: z.string().default("General"),
  status: z.enum(["PLANNING", "UPCOMING", "COMPLETED", "CANCELLED"]).default("PLANNING"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
