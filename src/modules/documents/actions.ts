"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  DesignJobStatus,
  DocumentCategory,
  DocumentConfidentiality,
  NotificationType,
  OpportunityMemberRole,
  RoleKey,
  TaskPriority,
  DesignPackageStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { storageDriver } from "@/lib/storage";
import type { StoredFile } from "@/lib/storage/storage";
import { opportunityViewWhere } from "@/modules/crm/access";
import {
  documentCategoryLabel,
  DESIGN_REQUIRED_CATEGORIES,
} from "@/modules/documents/options";
import { canPrepareDesignPackage } from "@/modules/pricing/access";
import { completeAutomationTask, dueInHours, recordOperationalEvent, userIdsForRole } from "@/modules/operations/events";
import { PERMISSIONS } from "@/modules/rbac/permissions";

export type DocumentActionState = { error?: string; success?: string };

type StagedUpload = {
  category: DocumentCategory;
  file: File;
  stored: StoredFile;
};

function maxUploadBytes(): number {
  const parsed = Number(process.env.MAX_UPLOAD_BYTES ?? 26_214_400);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 26_214_400;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The file request could not be completed.";
}

function readOptionalFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function validateFile(file: File) {
  if (file.size > maxUploadBytes()) {
    throw new Error(`File ${file.name} exceeds the ${Math.round(maxUploadBytes() / 1024 / 1024)} MB limit.`);
  }
}

async function stageFile(
  opportunityId: string,
  category: DocumentCategory,
  file: File,
): Promise<StagedUpload> {
  validateFile(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storageDriver().put({
    bytes,
    originalName: file.name,
    entityType: "opportunity",
    entityId: opportunityId,
  });
  return { category, file, stored };
}

async function createVersion(
  tx: Prisma.TransactionClient,
  opportunityId: string,
  upload: StagedUpload,
  userId: string,
) {
  let document = await tx.document.findFirst({
    where: { opportunityId, category: upload.category, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!document) {
    document = await tx.document.create({
      data: {
        title: documentCategoryLabel(upload.category),
        category: upload.category,
        confidentiality:
          upload.category === DocumentCategory.PROJECT_COSTING
            ? DocumentConfidentiality.FINANCE_RESTRICTED
            : DocumentConfidentiality.STANDARD,
        opportunityId,
        isRequired: DESIGN_REQUIRED_CATEGORIES.includes(upload.category),
      },
    });
  }

  const versionNo = document.currentVersion + 1;
  const version = await tx.documentVersion.create({
    data: {
      documentId: document.id,
      versionNo,
      originalName: upload.file.name,
      storageKey: upload.stored.storageKey,
      mimeType: upload.file.type || "application/octet-stream",
      sizeBytes: BigInt(upload.stored.sizeBytes),
      checksumSha256: upload.stored.checksumSha256,
      uploadedById: userId,
    },
  });
  await tx.document.update({ where: { id: document.id }, data: { currentVersion: versionNo } });
  return version;
}

export async function saveDesignPackageAction(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireUser();
  if (!canPrepareDesignPackage(user)) {
    return { error: "Only the assigned designer can prepare the design package." };
  }

  const opportunityId = String(formData.get("opportunityId") ?? "");
  const designReference = String(formData.get("designReference") ?? "").trim();
  const revisionLabel = String(formData.get("revisionLabel") ?? "").trim();
  const designFurnitureEur = String(formData.get("designFurnitureEur") ?? "0").trim();
  const designAuxiliaryEur = String(formData.get("designAuxiliaryEur") ?? "0").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const submit = String(formData.get("intent") ?? "SAVE") === "SUBMIT";

  if (!opportunityId || !designReference) return { error: "Design reference is required." };
  if (!/^\d{1,15}(?:\.\d{1,2})?$/.test(designFurnitureEur) || !/^\d{1,15}(?:\.\d{1,2})?$/.test(designAuxiliaryEur)) {
    return { error: "Design values must be valid EUR amounts." };
  }

  const opportunity = await db.opportunity.findFirst({
    where: { AND: [{ id: opportunityId, archivedAt: null }, opportunityViewWhere(user)] },
    include: { designJobs: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!opportunity) return { error: "Opportunity not found or not accessible." };

  const currentDesignJob = opportunity.designJobs[0];
  if (currentDesignJob && currentDesignJob.assignedToId !== user.id) {
    return { error: "This design is assigned to another designer." };
  }

  const fileMap: Array<[string, DocumentCategory]> = [
    ["designFile", DocumentCategory.DESIGN_SOURCE_FILE],
    ["designPdf", DocumentCategory.DESIGN],
    ["elementList", DocumentCategory.ELEMENT_LIST],
    ["designQuotation", DocumentCategory.DESIGN_SUPPLIER_QUOTATION],
    ["appliancesList", DocumentCategory.APPLIANCES_LIST],
  ];
  const staged: StagedUpload[] = [];

  try {
    for (const [key, category] of fileMap) {
      const file = readOptionalFile(formData, key);
      if (file) staged.push(await stageFile(opportunity.id, category, file));
    }

    const result = await db.$transaction(async (tx) => {
      if (!currentDesignJob) {
        await tx.opportunityMember.deleteMany({
          where: { opportunityId: opportunity.id, role: OpportunityMemberRole.DESIGN_OWNER },
        });
        await tx.opportunityMember.create({
          data: { opportunityId: opportunity.id, userId: user.id, role: OpportunityMemberRole.DESIGN_OWNER },
        });
        await tx.designJob.create({
          data: {
            opportunityId: opportunity.id,
            assignedToId: user.id,
            createdById: user.id,
            status: DesignJobStatus.IN_PROGRESS,
          },
        });
      }

      for (const upload of staged) await createVersion(tx, opportunity.id, upload, user.id);

      const presentDocuments = await tx.document.findMany({
        where: {
          opportunityId: opportunity.id,
          archivedAt: null,
          currentVersion: { gt: 0 },
          category: { in: DESIGN_REQUIRED_CATEGORIES },
        },
        select: { category: true },
      });
      const present = new Set(presentDocuments.map((item) => item.category));
      const complete = DESIGN_REQUIRED_CATEGORIES.every((category) => present.has(category));
      if (submit && !complete) {
        const missing = DESIGN_REQUIRED_CATEGORIES.filter((category) => !present.has(category));
        throw new Error(`design package is incomplete: ${missing.map(documentCategoryLabel).join(", ")}.`);
      }

      const status = submit
        ? DesignPackageStatus.READY
        : complete
          ? DesignPackageStatus.READY
          : DesignPackageStatus.INCOMPLETE;

      await tx.opportunity.update({
        where: { id: opportunity.id },
        data: { designReference },
      });
      const designPackage = await tx.designPackage.upsert({
        where: { opportunityId: opportunity.id },
        create: {
          opportunityId: opportunity.id,
          status,
          designReference,
          revisionLabel: revisionLabel || null,
          designFurnitureEur,
          designAuxiliaryEur,
          submittedAt: submit ? new Date() : null,
          submittedById: submit ? user.id : null,
          readyAt: complete ? new Date() : null,
          notes: notes || null,
        },
        update: {
          status,
          designReference,
          revisionLabel: revisionLabel || null,
          designFurnitureEur,
          designAuxiliaryEur,
          submittedAt: submit ? new Date() : undefined,
          submittedById: submit ? user.id : undefined,
          readyAt: complete ? new Date() : null,
          notes: notes || null,
        },
      });

      const financeIds = submit && complete ? await userIdsForRole(tx, RoleKey.FINANCE) : [];
      if (submit && complete) await completeAutomationTask(tx, `design-package:${opportunity.id}`);
      await recordOperationalEvent(tx, {
        actorId: user.id,
        actorName: user.displayName,
        action: staged.length ? AuditAction.FILE_UPLOAD : AuditAction.UPDATE,
        entityType: "DesignPackage",
        entityId: designPackage.id,
        opportunityId: opportunity.id,
        actionUrl: `/opportunities/${opportunity.id}?section=${submit && complete ? "pricing" : "design"}`,
        subject: submit && complete ? "design package submitted to Finance" : "design package draft updated",
        body: `${designReference}${revisionLabel ? ` · ${revisionLabel}` : ""}${staged.length ? ` · ${staged.length} file(s) uploaded` : ""}`,
        after: { designReference, revisionLabel: revisionLabel || null, designFurnitureEur, designAuxiliaryEur, uploadedCategories: staged.map((item) => item.category), status },
        notifications: financeIds.map((recipientId) => ({ recipientId, type: NotificationType.APPROVAL_REQUIRED, title: `design package ready · ${opportunity.reference}`, body: `${user.displayName} submitted Design values and required files.`, href: `/opportunities/${opportunity.id}?section=pricing`, actionLabel: "Prepare pricing" })),
        task: financeIds[0] ? { automationKey: `finance-pricing:${opportunity.id}`, title: `Prepare Finance pricing · ${opportunity.reference}`, description: `Review design package ${designReference} and prepare ${opportunity.track} pricing.`, assignedToId: financeIds[0], dueAt: dueInHours(24), priority: TaskPriority.HIGH, sectionKey: "pricing", actionUrl: `/opportunities/${opportunity.id}?section=pricing`, metadata: { workflow: "FINANCE_PRICING", track: opportunity.track } } : undefined,
      });
      return { complete, status };
    });

    revalidatePath(`/opportunities/${opportunity.id}`);
    revalidatePath("/pricing");
    return {
      success: result.complete
        ? "design package saved and ready for Finance pricing."
        : "design package draft saved. Missing files are shown below.",
    };
  } catch (error) {
    await Promise.all(staged.map((item) => storageDriver().delete(item.stored.storageKey)));
    return { error: errorMessage(error) };
  }
}

export async function uploadFinanceDocumentAction(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.FINANCE_PRICING_PREPARE)) {
    return { error: "Only Finance can upload project costing evidence." };
  }
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const file = readOptionalFile(formData, "projectCostingFile");
  if (!opportunityId || !file) return { error: "Choose the Project Costing Excel file." };

  const opportunity = await db.opportunity.findFirst({
    where: { id: opportunityId, archivedAt: null },
    select: { id: true },
  });
  if (!opportunity) return { error: "Opportunity not found." };

  const staged = await stageFile(opportunity.id, DocumentCategory.PROJECT_COSTING, file);
  try {
    const version = await db.$transaction((tx) => createVersion(tx, opportunity.id, staged, user.id));
    revalidatePath(`/opportunities/${opportunity.id}`);
    return { success: `Project Costing Excel uploaded as version ${version.versionNo}.` };
  } catch (error) {
    await storageDriver().delete(staged.stored.storageKey);
    return { error: errorMessage(error) };
  }
}


export async function uploadRossDocumentAction(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.ORDER_HANDOVER_MANAGE)) {
    return { error: "Only Order Coordination/Order Coordination can upload OC/AB and PO files." };
  }
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const categoryValue = String(formData.get("category") ?? "");
  const category = categoryValue === "SUPPLIER_ORDER_CONFIRMATION" ? DocumentCategory.SUPPLIER_ORDER_CONFIRMATION : categoryValue === "ERP_PO" ? DocumentCategory.ERP_PO : null;
  const file = readOptionalFile(formData, "file");
  if (!opportunityId || !category || !file) return { error: "Choose OC/AB or ERP PO and a file." };
  const opportunity = await db.opportunity.findFirst({ where: { id: opportunityId, archivedAt: null }, select: { id: true } });
  if (!opportunity) return { error: "Opportunity not found." };
  const staged = await stageFile(opportunity.id, category, file);
  try {
    const version = await db.$transaction((tx) => createVersion(tx, opportunity.id, staged, user.id));
    revalidatePath(`/opportunities/${opportunity.id}`);
    revalidatePath("/orders");
    return { success: `${documentCategoryLabel(category)} uploaded as version ${version.versionNo}.` };
  } catch (error) {
    await storageDriver().delete(staged.stored.storageKey);
    return { error: errorMessage(error) };
  }
}


export async function uploadFinanceInvoiceAction(
  _previousState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireUser();
  if (!user.permissions.includes(PERMISSIONS.FINANCE_PRICING_PREPARE)) {
    return { error: "Only Finance can upload the customer invoice." };
  }
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const file = readOptionalFile(formData, "invoiceFile");
  if (!opportunityId || !file) return { error: "Choose the Finance invoice PDF." };
  const opportunity = await db.opportunity.findFirst({ where: { id: opportunityId, archivedAt: null }, select: { id: true } });
  if (!opportunity) return { error: "Opportunity not found." };
  const staged = await stageFile(opportunity.id, DocumentCategory.CUSTOMER_INVOICE, file);
  try {
    const version = await db.$transaction((tx) => createVersion(tx, opportunity.id, staged, user.id));
    revalidatePath(`/opportunities/${opportunity.id}`);
    return { success: `Finance invoice uploaded as version ${version.versionNo}.` };
  } catch (error) {
    await storageDriver().delete(staged.stored.storageKey);
    return { error: errorMessage(error) };
  }
}

