import { z } from "zod";
import {
  ActivityType,
  CustomerType,
  LeadStatus,
  OpportunityStage,
  OpportunityTrack,
} from "@/generated/prisma/client";

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : value,
    z.string().trim().max(max).optional(),
  );


const optionalUuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().uuid().optional(),
);

const optionalTrack = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.enum(OpportunityTrack).optional(),
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().toLowerCase().email("Enter a valid email address.").max(254).optional(),
);

const optionalDateTime = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date and time.")
    .optional(),
);

const optionalMoney = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .regex(/^\d{1,15}(?:\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimals.")
    .optional(),
);

const optionalPercentage = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .coerce
    .number()
    .min(0, "Probability cannot be below 0.")
    .max(100, "Probability cannot exceed 100.")
    .optional(),
);

export const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Lead name is required.").max(160),
  mobile: optionalText(40),
  email: optionalEmail,
  track: optionalTrack,
  source: optionalText(120),
  channel: optionalText(120),
  campaign: optionalText(160),
  interestCategory: optionalText(160),
  notes: optionalText(4000),
  nextFollowUpAt: optionalDateTime,
  ownerId: optionalUuid,
});

export const updateLeadSchema = z.object({
  leadId: z.string().uuid(),
  name: z.string().trim().min(2, "Lead name is required.").max(160),
  mobile: optionalText(40),
  email: optionalEmail,
  track: optionalTrack,
  status: z.enum(LeadStatus).refine(
    (status) => status !== LeadStatus.CONVERTED,
    "Converted status is set only by the conversion workflow.",
  ),
  source: optionalText(120),
  channel: optionalText(120),
  campaign: optionalText(160),
  interestCategory: optionalText(160),
  notes: optionalText(4000),
  nextFollowUpAt: optionalDateTime,
  ownerId: optionalUuid,
});

export const convertLeadSchema = z.object({
  leadId: z.string().uuid(),
  customerType: z.enum(CustomerType),
  opportunityTitle: z
    .string()
    .trim()
    .min(3, "Opportunity title is required.")
    .max(200),
  track: z.enum(OpportunityTrack),
  siteAddress: optionalText(500),
  requirementsSummary: optionalText(4000),
  customerBudgetAed: optionalMoney,
  probabilityPct: optionalPercentage,
  nextFollowUpAt: optionalDateTime,
  ownerId: optionalUuid,
});

export const addContactSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().trim().min(2, "Contact name is required.").max(160),
  roleTitle: optionalText(120),
  mobile: optionalText(40),
  email: optionalEmail,
  isPrimary: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});

export const updateOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  stage: z.enum(OpportunityStage),
  siteAddress: optionalText(500),
  requirementsSummary: optionalText(4000),
  customerBudgetAed: optionalMoney,
  probabilityPct: optionalPercentage,
  nextFollowUpAt: optionalDateTime,
  lostReason: optionalText(1000),
  ownerId: optionalUuid,
});

export const addActivitySchema = z.object({
  opportunityId: z.string().uuid(),
  type: z.enum(ActivityType),
  subject: z.string().trim().min(2, "Subject is required.").max(200),
  body: optionalText(4000),
});
