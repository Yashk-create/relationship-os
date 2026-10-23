import { z } from "zod";

// Server Actions are reachable by direct POST requests, so every action
// validates its input here instead of trusting the shape the UI sends.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
    throw new ValidationError(`Invalid input - ${where}${issue.message}`);
  }
  return result.data;
}

export const idSchema = z.uuid();

// Optional free text: trimmed; "" and undefined both become null in the database.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const requiredText = (max: number) => z.string().trim().min(1, "is required").max(max);

const optionalUrl = z
  .union([z.literal(""), z.url({ protocol: /^https?$/ }).max(500)])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const optionalId = z
  .union([z.literal(""), idSchema])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const validDate = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), "is not a valid date");

export const contactInput = z.object({
  name: requiredText(200),
  company: optionalText(200),
  role: optionalText(200),
  email: z
    .union([z.literal(""), z.email().max(320)])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  phone: optionalText(40),
  linkedin: optionalUrl,
  website: optionalUrl,
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional().default([]),
  notes: optionalText(10_000),
});

export const opportunityInput = z.object({
  title: requiredText(200),
  value: z.number().finite().min(0).max(1e12).optional().nullable().transform((v) => v ?? null),
  status: requiredText(60),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  contactId: optionalId,
  notes: optionalText(10_000),
  nextActionDate: validDate.optional().nullable().transform((v) => v ?? null),
});

export const statusInput = requiredText(60);

export const followUpInput = z.object({
  title: requiredText(200),
  dueDate: validDate,
  contactId: optionalId,
  opportunityId: optionalId,
});

export const meetingInput = z.object({
  title: requiredText(200),
  meetingDate: validDate,
  notes: optionalText(10_000),
  actionItems: z.array(z.string().trim().min(1).max(500)).max(50).optional().default([]),
  participantIds: z.array(idSchema).max(50).optional().default([]),
});

export const interactionInput = z.object({
  contactId: idSchema,
  type: z.enum(["CALL", "EMAIL", "LINKEDIN_MESSAGE", "NOTE"]),
  description: requiredText(5_000),
});

export const roleInput = z.enum(["JOB_SEEKER", "FREELANCER", "FOUNDER"]);

export const noteInput = z.string().max(50_000);
