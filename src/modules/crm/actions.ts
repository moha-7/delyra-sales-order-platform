"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ActivityType,
  AuditAction,
  DataQualityStatus,
  LeadStatus,
  NotificationType,
  OpportunityStage,
  RoleKey,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  canConvertLead,
  canCreateLead,
  canCreateProjectLead,
  canCreateRetailLead,
  canManageAllLeads,
  canManageAllOpportunities,
  canManageCustomers,
  leadManageWhere,
  opportunityManageWhere,
  customerManageWhere,
} from "@/modules/crm/access";
import {
  contactDataQuality,
  toOptionalDate,
  toOptionalDecimalString,
} from "@/modules/crm/domain";
import { assertAssignableOwner } from "@/modules/crm/queries";
import {
  addActivitySchema,
  addContactSchema,
  convertLeadSchema,
  createLeadSchema,
  updateLeadSchema,
  updateOpportunitySchema,
} from "@/modules/crm/schemas";
import { nextInternalReference } from "@/modules/numbering/reference-service";
import {
  issueBusinessReference,
  REFERENCE_TYPE_CODES,
  trackCodeForOpportunityTrack,
} from "@/modules/crm/references";


type LeadTrackValue = "RETAIL" | "PROJECT";

function trackFromLeadMode(
  value: FormDataEntryValue | undefined,
): LeadTrackValue | null {
  if (value === "retail") return "RETAIL";
  if (value === "project") return "PROJECT";

  return null;
}

function canUseTrackWorkspace(
  user: AuthenticatedUser,
  track: LeadTrackValue,
): boolean {
  if (track === "RETAIL") return canCreateRetailLead(user);

  return canCreateProjectLead(user);
}

function inferLeadTrackForUser(user: AuthenticatedUser): LeadTrackValue | null {
  const canRetail = canCreateRetailLead(user);
  const canProject = canCreateProjectLead(user);

  if (canRetail && !canProject) return "RETAIL";
  if (canProject && !canRetail) return "PROJECT";

  return null;
}

function resolveLeadTrackForUser(
  user: AuthenticatedUser,
  requestedTrack: LeadTrackValue | undefined | null,
): { track: LeadTrackValue } | { error: string } {
  const track = requestedTrack ?? inferLeadTrackForUser(user);

  if (!track) {
    return {
      error: "Lead workspace is required. Use the Retail or Project lead page.",
    };
  }

  if (!canUseTrackWorkspace(user, track)) {
    return {
      error: "You do not have permission to create leads for this workspace.",
    };
  }

  return { track };
}

function resolveLeadTrackFromModeForUser(
  user: AuthenticatedUser,
  leadMode: FormDataEntryValue | undefined,
): { track: LeadTrackValue } | { error: string } {
  const track = trackFromLeadMode(leadMode);

  if (!track) {
    return {
      error: "Lead workspace is required. Use the Retail or Project lead page.",
    };
  }

  if (!canUseTrackWorkspace(user, track)) {
    return {
      error: "You do not have permission to create leads for this workspace.",
    };
  }

  return { track };
}

export type CrmActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function formValue(formData: FormData, key: string): FormDataEntryValue | undefined {
  const value = formData.get(key);
  return value === null ? undefined : value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}

function textValue(formData: FormData, key: string): string | undefined {
  const value = formValue(formData, key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function appendStructuredNotes(base: string | undefined, title: string, rows: Array<[string, string | undefined]>): string | undefined {
  const details = rows.filter(([, value]) => Boolean(value));
  if (!details.length) return base;
  const block = [
    title,
    ...details.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
  return [base?.trim(), block].filter(Boolean).join("\n\n");
}

function leadNotesWithOperationalContext(formData: FormData, parsedNotes?: string): string | undefined {
  const mode = textValue(formData, "leadMode");
  if (mode === "retail") {
    return appendStructuredNotes(parsedNotes, "Retail intake", [
      ["Branch / showroom", textValue(formData, "branch")],
      ["Budget range", textValue(formData, "budgetRange")],
    ]);
  }

  if (mode === "project") {
    return appendStructuredNotes(parsedNotes, "Project / Villa intake", [
      ["Client / company", textValue(formData, "clientCompany")],
      ["Contact person", textValue(formData, "contactPerson")],
      ["Client type", textValue(formData, "clientType")],
      ["Project type", textValue(formData, "interestCategory")],
      ["Emirate", textValue(formData, "emirate")],
      ["Area", textValue(formData, "area")],
      ["Site location", textValue(formData, "siteLocation")],
      ["Number of kitchens / units", textValue(formData, "numberOfUnits")],
      ["BOQ / requirement status", textValue(formData, "boqStatus")],
      ["Design status", textValue(formData, "designStatus")],
      ["Measurement status", textValue(formData, "measurementStatus")],
      ["Expected quotation date", textValue(formData, "expectedQuotationDate")],
      ["Client tender / BOQ reference", textValue(formData, "tenderReference")],
    ]);
  }

  return parsedNotes;
}


function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function structuredNoteValue(
  notes: string | null | undefined,
  label: string,
): string | null {
  if (!notes) return null;

  const match = notes.match(new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, "im"));
  const value = match?.[1]?.trim();

  return value || null;
}

function clientTenderReferenceFromLead(notes: string | null | undefined): string | null {
  return (
    structuredNoteValue(notes, "Client tender / BOQ reference") ??
    structuredNoteValue(notes, "Tender / reference") ??
    structuredNoteValue(notes, "Tender / reference number")
  );
}



function mentionTokens(text: string | null | undefined): string[] {
  const matches = text?.match(/@([a-zA-Z0-9._-]{2,60})/g) ?? [];
  return [...new Set(matches.map((match) => match.slice(1).toLowerCase()))];
}

async function mentionRecipients(tx: Prisma.TransactionClient, tokens: string[], actorId: string) {
  if (!tokens.length) return [] as Array<{ id: string }>;
  const roleAliases: Record<string, RoleKey> = {
    finance: RoleKey.FINANCE,
    accounts: RoleKey.FINANCE,
    manager: RoleKey.MANAGER,
    branchmanager: RoleKey.MANAGER,
    designer: RoleKey.DESIGNER,
    design: RoleKey.DESIGNER,
    operations: RoleKey.ORDER_COORDINATOR,
    operation: RoleKey.ORDER_COORDINATOR,
    orders: RoleKey.ORDER_COORDINATOR,
    sales: RoleKey.RETAIL_SALES,
  };
  const roleKeys = tokens.map((token) => roleAliases[token.replace(/[^a-z]/g, "")]).filter(Boolean);
  const emailCandidates = tokens.flatMap((token) => [token, token.includes("@") ? token : `${token}@northstar.example`]);
  const users = await tx.user.findMany({
    where: {
      archivedAt: null,
      id: { not: actorId },
      OR: [
        { email: { in: emailCandidates } },
        { initials: { in: tokens.map((token) => token.toUpperCase()) } },
        ...tokens.map((token) => ({ displayName: { contains: token.replaceAll(".", " "), mode: "insensitive" as const } })),
        ...(roleKeys.length ? [{ userRoles: { some: { role: { key: { in: roleKeys } } } } }] : []),
      ],
    },
    select: { id: true },
  });
  const seen = new Set<string>();
  return users.filter((user) => !seen.has(user.id) && seen.add(user.id));
}

async function resolveOwnerId(options: {
  tx: Prisma.TransactionClient;
  actorId: string;
  requestedOwnerId?: string;
  existingOwnerId?: string;
  canManageAll: boolean;
}): Promise<string> {
  const fallback = options.existingOwnerId ?? options.actorId;
  const ownerId = options.canManageAll
    ? options.requestedOwnerId ?? fallback
    : fallback;

  await assertAssignableOwner(options.tx, ownerId);
  return ownerId;
}

export async function createLeadAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const user = await requireUser();
  if (!canCreateLead(user)) {
    return { error: "You do not have permission to create leads." };
  }

  const resolvedTrack = resolveLeadTrackFromModeForUser(
    user,
    formValue(formData, "leadMode"),
  );
  if ("error" in resolvedTrack) {
    return { error: resolvedTrack.error };
  }

  const parsed = createLeadSchema.safeParse({
    name: formValue(formData, "name"),
    mobile: formValue(formData, "mobile"),
    email: formValue(formData, "email"),
    track: resolvedTrack.track,
    source: formValue(formData, "source"),
    channel: formValue(formData, "channel"),
    campaign: formValue(formData, "campaign"),
    interestCategory: formValue(formData, "interestCategory"),
    notes: formValue(formData, "notes"),
    nextFollowUpAt: formValue(formData, "nextFollowUpAt"),
    ownerId: formValue(formData, "ownerId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let leadId: string;
  try {
    leadId = await db.$transaction(async (tx) => {
      const ownerId = await resolveOwnerId({
        tx,
        actorId: user.id,
        requestedOwnerId: parsed.data.ownerId,
        canManageAll: canManageAllLeads(user),
      });
      const reference = await issueBusinessReference(tx, {
        trackCode: trackCodeForOpportunityTrack(resolvedTrack.track),
        typeCode: REFERENCE_TYPE_CODES.LEAD,
        year: new Date().getFullYear(),
      });
      const dataQualityStatus = contactDataQuality(parsed.data);

      const lead = await tx.lead.create({
        data: {
          reference,
          status: LeadStatus.NEW,
          track: resolvedTrack.track,
          name: parsed.data.name,
          mobile: parsed.data.mobile,
          email: parsed.data.email,
          source: parsed.data.source,
          channel: parsed.data.channel,
          campaign: parsed.data.campaign,
          interestCategory: parsed.data.interestCategory,
          notes: leadNotesWithOperationalContext(formData, parsed.data.notes),
          nextFollowUpAt: toOptionalDate(parsed.data.nextFollowUpAt),
          dataQualityStatus,
          ownerId,
          createdById: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.CREATE,
          entityType: "Lead",
          entityId: lead.id,
          after: {
            reference: lead.reference,
            ownerId,
            status: lead.status,
            dataQualityStatus,
          },
        },
      });

      return lead.id;
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/leads");
  redirect(`/leads/${leadId}`);
}

export async function updateLeadAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const user = await requireUser();
  const parsed = updateLeadSchema.safeParse({
    leadId: formValue(formData, "leadId"),
    name: formValue(formData, "name"),
    mobile: formValue(formData, "mobile"),
    email: formValue(formData, "email"),
    track: formValue(formData, "track"),
    status: formValue(formData, "status"),
    source: formValue(formData, "source"),
    channel: formValue(formData, "channel"),
    campaign: formValue(formData, "campaign"),
    interestCategory: formValue(formData, "interestCategory"),
    notes: formValue(formData, "notes"),
    nextFollowUpAt: formValue(formData, "nextFollowUpAt"),
    ownerId: formValue(formData, "ownerId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          AND: [
            { id: parsed.data.leadId, archivedAt: null },
            leadManageWhere(user),
          ],
        },
      });
      if (!lead) throw new Error("Lead not found or you cannot edit it.");
      if (lead.status === LeadStatus.CONVERTED) {
        throw new Error("Converted leads cannot be edited.");
      }

      const ownerId = await resolveOwnerId({
        tx,
        actorId: user.id,
        requestedOwnerId: parsed.data.ownerId,
        existingOwnerId: lead.ownerId,
        canManageAll: canManageAllLeads(user),
      });
      const dataQualityStatus = contactDataQuality(parsed.data);

      const updated = await tx.lead.update({
        where: { id: lead.id },
        data: {
          name: parsed.data.name,
          mobile: parsed.data.mobile,
          email: parsed.data.email,
          track: parsed.data.track,
          status: parsed.data.status,
          source: parsed.data.source,
          channel: parsed.data.channel,
          campaign: parsed.data.campaign,
          interestCategory: parsed.data.interestCategory,
          notes: parsed.data.notes,
          nextFollowUpAt: toOptionalDate(parsed.data.nextFollowUpAt),
          dataQualityStatus,
          ownerId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.UPDATE,
          entityType: "Lead",
          entityId: lead.id,
          before: {
            status: lead.status,
            ownerId: lead.ownerId,
            mobile: lead.mobile,
            email: lead.email,
          },
          after: {
            status: updated.status,
            ownerId: updated.ownerId,
            mobile: updated.mobile,
            email: updated.email,
            dataQualityStatus: updated.dataQualityStatus,
          },
        },
      });
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { success: "Lead updated." };
}

export async function convertLeadAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const user = await requireUser();
  if (!canConvertLead(user)) {
    return { error: "You do not have permission to convert leads." };
  }

  const parsed = convertLeadSchema.safeParse({
    leadId: formValue(formData, "leadId"),
    customerType: formValue(formData, "customerType"),
    opportunityTitle: formValue(formData, "opportunityTitle"),
    track: formValue(formData, "track"),
    siteAddress: formValue(formData, "siteAddress"),
    requirementsSummary: formValue(formData, "requirementsSummary"),
    customerBudgetAed: formValue(formData, "customerBudgetAed"),
    probabilityPct: formValue(formData, "probabilityPct"),
    nextFollowUpAt: formValue(formData, "nextFollowUpAt"),
    ownerId: formValue(formData, "ownerId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let opportunityId: string;
  try {
    opportunityId = await db.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          AND: [
            { id: parsed.data.leadId, archivedAt: null },
            leadManageWhere(user),
          ],
        },
      });

      if (!lead) throw new Error("Lead not found or you cannot convert it.");
      if (
        lead.status === LeadStatus.CONVERTED ||
        lead.convertedCustomerId ||
        lead.convertedOpportunityId
      ) {
        throw new Error("This lead has already been converted.");
      }
      if (lead.status !== LeadStatus.QUALIFIED) {
        throw new Error("Only qualified leads can be converted.");
      }

      const ownerId = await resolveOwnerId({
        tx,
        actorId: user.id,
        requestedOwnerId: parsed.data.ownerId,
        existingOwnerId: lead.ownerId,
        canManageAll: canManageAllLeads(user),
      });
      const leadTrack =
        lead.track === "RETAIL" || lead.track === "PROJECT"
          ? lead.track
          : lead.notes?.includes("Project / Villa intake")
            ? "PROJECT"
            : parsed.data.track;
      const resolvedOpportunityTrack = resolveLeadTrackForUser(user, leadTrack);
      if ("error" in resolvedOpportunityTrack) {
        throw new Error(resolvedOpportunityTrack.error);
      }

      const customerReference = await nextInternalReference(
        tx,
        "CUSTOMER_INTERNAL",
        "CUS",
      );
      const opportunityTrackCode = trackCodeForOpportunityTrack(resolvedOpportunityTrack.track);
      const opportunityReference = await issueBusinessReference(tx, {
        trackCode: opportunityTrackCode,
        typeCode: REFERENCE_TYPE_CODES.OPPORTUNITY,
        year: new Date().getFullYear(),
      });
      const tenderSystemReference =
        resolvedOpportunityTrack.track === "PROJECT"
          ? await issueBusinessReference(tx, {
              trackCode: opportunityTrackCode,
              typeCode: REFERENCE_TYPE_CODES.TENDER,
              year: new Date().getFullYear(),
            })
          : null;
      const clientTenderReference =
        resolvedOpportunityTrack.track === "PROJECT"
          ? clientTenderReferenceFromLead(lead.notes)
          : null;
      const dataQualityStatus = contactDataQuality(lead);

      const customer = await tx.customer.create({
        data: {
          reference: customerReference,
          name: lead.name,
          type: parsed.data.customerType,
          mobile: lead.mobile,
          email: lead.email,
          dataQualityStatus,
          createdById: user.id,
        },
      });

      if (lead.mobile || lead.email) {
        await tx.contact.create({
          data: {
            customerId: customer.id,
            name: lead.name,
            mobile: lead.mobile,
            email: lead.email,
            isPrimary: true,
            createdById: user.id,
          },
        });
      }

      const opportunity = await tx.opportunity.create({
        data: {
          reference: opportunityReference,
          title: parsed.data.opportunityTitle,
          track: resolvedOpportunityTrack.track,
          stage: OpportunityStage.QUALIFIED,
          tenderSystemReference,
          clientTenderReference,
          customerId: customer.id,
          ownerId,
          createdById: user.id,
          siteAddress: parsed.data.siteAddress,
          requirementsSummary: parsed.data.requirementsSummary,
          customerBudgetAed: toOptionalDecimalString(parsed.data.customerBudgetAed),
          probabilityPct:
            parsed.data.probabilityPct === undefined
              ? null
              : parsed.data.probabilityPct.toString(),
          nextFollowUpAt: toOptionalDate(parsed.data.nextFollowUpAt),
          dataQualityStatus,
        },
      });

      if (dataQualityStatus === DataQualityStatus.NEEDS_VERIFICATION) {
        const taskReference = await nextInternalReference(
          tx,
          "TASK_INTERNAL",
          "TASK",
        );
        await tx.task.create({
          data: {
            reference: taskReference,
            title: "Verify customer contact details",
            description:
              "The lead was converted without a mobile number or email address. Keep missing values as NULL and verify them with the customer.",
            opportunityId: opportunity.id,
            assignedToId: ownerId,
            createdById: user.id,
          },
        });
      }

      const conversionClaim = await tx.lead.updateMany({
        where: {
          id: lead.id,
          status: LeadStatus.QUALIFIED,
          convertedCustomerId: null,
          convertedOpportunityId: null,
        },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: new Date(),
          convertedCustomerId: customer.id,
          convertedOpportunityId: opportunity.id,
        },
      });
      if (conversionClaim.count !== 1) {
        throw new Error("This lead was converted by another request. Refresh the page.");
      }

      await tx.activity.create({
        data: {
          type: ActivityType.SYSTEM,
          subject: `Converted from lead ${lead.reference}`,
          body: "Customer and qualified opportunity created atomically.",
          customerId: customer.id,
          opportunityId: opportunity.id,
          createdById: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.UPDATE,
          entityType: "Lead",
          entityId: lead.id,
          before: { status: lead.status },
          after: {
            status: LeadStatus.CONVERTED,
            customerId: customer.id,
            opportunityId: opportunity.id,
          },
          metadata: { workflow: "LEAD_CONVERSION" },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.CREATE,
          entityType: "Customer",
          entityId: customer.id,
          after: { reference: customer.reference, sourceLeadId: lead.id },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.CREATE,
          entityType: "Opportunity",
          entityId: opportunity.id,
          after: {
            reference: opportunity.reference,
            stage: opportunity.stage,
            ownerId,
            sourceLeadId: lead.id,
            tenderSystemReference: opportunity.tenderSystemReference,
            clientTenderReference: opportunity.clientTenderReference,
          },
        },
      });

      return opportunity.id;
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/leads");
  revalidatePath("/customers");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunityId}`);
}

export async function addContactAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const user = await requireUser();
  if (!canManageCustomers(user)) {
    return { error: "You do not have permission to manage customer contacts." };
  }

  const parsed = addContactSchema.safeParse({
    customerId: formValue(formData, "customerId"),
    name: formValue(formData, "name"),
    roleTitle: formValue(formData, "roleTitle"),
    mobile: formValue(formData, "mobile"),
    email: formValue(formData, "email"),
    isPrimary: formValue(formData, "isPrimary"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          AND: [
            { id: parsed.data.customerId, archivedAt: null },
            customerManageWhere(user),
          ],
        },
      });
      if (!customer) throw new Error("Customer not found or you cannot edit it.");

      if (parsed.data.isPrimary) {
        await tx.contact.updateMany({
          where: { customerId: customer.id, archivedAt: null },
          data: { isPrimary: false },
        });
      }

      const contact = await tx.contact.create({
        data: {
          customerId: customer.id,
          name: parsed.data.name,
          roleTitle: parsed.data.roleTitle,
          mobile: parsed.data.mobile,
          email: parsed.data.email,
          isPrimary: parsed.data.isPrimary,
          createdById: user.id,
        },
      });

      if (
        customer.dataQualityStatus === DataQualityStatus.NEEDS_VERIFICATION &&
        (parsed.data.mobile || parsed.data.email)
      ) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { dataQualityStatus: DataQualityStatus.VERIFIED },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: AuditAction.CREATE,
          entityType: "Contact",
          entityId: contact.id,
          after: {
            customerId: customer.id,
            isPrimary: contact.isPrimary,
          },
        },
      });
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { success: "Contact added." };
}

export async function updateOpportunityAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const user = await requireUser();
  const parsed = updateOpportunitySchema.safeParse({
    opportunityId: formValue(formData, "opportunityId"),
    title: formValue(formData, "title"),
    stage: formValue(formData, "stage"),
    siteAddress: formValue(formData, "siteAddress"),
    requirementsSummary: formValue(formData, "requirementsSummary"),
    customerBudgetAed: formValue(formData, "customerBudgetAed"),
    probabilityPct: formValue(formData, "probabilityPct"),
    nextFollowUpAt: formValue(formData, "nextFollowUpAt"),
    lostReason: formValue(formData, "lostReason"),
    ownerId: formValue(formData, "ownerId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (parsed.data.stage === OpportunityStage.WON) {
    return { error: "Won is set only when Finance confirms the deposit." };
  }
  if (
    parsed.data.stage === OpportunityStage.LOST &&
    !parsed.data.lostReason
  ) {
    return { fieldErrors: { lostReason: ["Lost reason is required."] } };
  }

  try {
    await db.$transaction(async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: {
          AND: [
            { id: parsed.data.opportunityId, archivedAt: null },
            opportunityManageWhere(user),
          ],
        },
      });
      if (!opportunity) {
        throw new Error("Opportunity not found or you cannot edit it.");
      }
      if (opportunity.stage === OpportunityStage.WON) {
        throw new Error("Won opportunities cannot be edited in the CRM core screen.");
      }

      const ownerId = await resolveOwnerId({
        tx,
        actorId: user.id,
        requestedOwnerId: parsed.data.ownerId,
        existingOwnerId: opportunity.ownerId,
        canManageAll: canManageAllOpportunities(user),
      });

      const updated = await tx.opportunity.update({
        where: { id: opportunity.id },
        data: {
          title: parsed.data.title,
          stage: parsed.data.stage,
          siteAddress: parsed.data.siteAddress,
          requirementsSummary: parsed.data.requirementsSummary,
          customerBudgetAed: toOptionalDecimalString(parsed.data.customerBudgetAed),
          probabilityPct:
            parsed.data.probabilityPct === undefined
              ? null
              : parsed.data.probabilityPct.toString(),
          nextFollowUpAt: toOptionalDate(parsed.data.nextFollowUpAt),
          lostReason:
            parsed.data.stage === OpportunityStage.LOST
              ? parsed.data.lostReason
              : null,
          ownerId,
          version: { increment: 1 },
        },
      });

      if (opportunity.stage !== updated.stage) {
        await tx.activity.create({
          data: {
            type: ActivityType.STATUS_CHANGE,
            subject: `Stage changed: ${opportunity.stage} → ${updated.stage}`,
            opportunityId: opportunity.id,
            createdById: user.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action:
            opportunity.stage === updated.stage
              ? AuditAction.UPDATE
              : AuditAction.STAGE_CHANGE,
          entityType: "Opportunity",
          entityId: opportunity.id,
          before: {
            stage: opportunity.stage,
            ownerId: opportunity.ownerId,
            customerBudgetAed: opportunity.customerBudgetAed?.toString() ?? null,
          },
          after: {
            stage: updated.stage,
            ownerId: updated.ownerId,
            customerBudgetAed: updated.customerBudgetAed?.toString() ?? null,
          },
        },
      });
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  return { success: "Opportunity updated." };
}

export async function addOpportunityActivityAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const user = await requireUser();
  const parsed = addActivitySchema.safeParse({
    opportunityId: formValue(formData, "opportunityId"),
    type: formValue(formData, "type"),
    subject: formValue(formData, "subject"),
    body: formValue(formData, "body"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const opportunity = await db.opportunity.findFirst({
    where: {
      AND: [
        { id: parsed.data.opportunityId, archivedAt: null },
        opportunityManageWhere(user),
      ],
    },
    select: { id: true },
  });
  if (!opportunity) {
    return { error: "Opportunity not found or you cannot add activity." };
  }

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const activity = await tx.activity.create({
      data: {
        type: parsed.data.type,
        subject: parsed.data.subject,
        body: parsed.data.body,
        opportunityId: opportunity.id,
        createdById: user.id,
      },
    });
    const tokens = mentionTokens(`${parsed.data.subject} ${parsed.data.body ?? ""}`);
    const recipients = await mentionRecipients(tx, tokens, user.id);
    if (recipients.length) {
      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          recipientId: recipient.id,
          type: NotificationType.MENTION,
          title: `${user.displayName} mentioned you`,
          body: parsed.data.subject,
          entityType: "Opportunity",
          entityId: opportunity.id,
        })),
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: AuditAction.CREATE,
        entityType: "Activity",
        entityId: activity.id,
        after: { opportunityId: opportunity.id, type: parsed.data.type, subject: parsed.data.subject, mentions: tokens },
      },
    });
  });

  revalidatePath(`/opportunities/${opportunity.id}`);
  return { success: "Activity added." };
}
